
import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  ComputeBudgetProgram,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'
import base58 from 'bs58'
import {
  PRIVATE_KEY,
  RPC_ENDPOINT,
  RPC_WEBSOCKET_ENDPOINT,
  TOKEN_MINT,
  JITO_TIP,
} from './constants'
import PumpswapIDL from './contract/pumpswap-idl.json'
import PumpfunIDL from './contract/pumpfun-idl.json'
import { PumpAmm } from './contract/pumpswap-types'
import { Pump } from './contract/pumpfun-types'
import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { createAssociatedTokenAccountInstruction, createCloseAccountInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync, NATIVE_MINT } from '@solana/spl-token'
import { sendAndConfirmTransaction } from '@solana/web3.js';
import { makeBuyPumpfunTokenTx, makeMigrateTx } from './src/pumpfun'
import { sendBundle } from './executor'

const solanaConnection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment: "processed"
})

const mainKp = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY))

const provider = new AnchorProvider(solanaConnection, new NodeWallet(Keypair.generate()))
setProvider(provider);

export const PumpswapProgram = new Program<PumpAmm>(PumpswapIDL as PumpAmm, provider);
export const PumpfunProgram = new Program<Pump>(PumpfunIDL as Pump, provider);

const main = async () => {
  console.log("Listener is running")

  const mint = new PublicKey(TOKEN_MINT)

  const pool = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mint.toBuffer()],
    PumpfunProgram.programId
  )[0];
  const poolState = await PumpfunProgram.account.bondingCurve.fetch(pool)
  console.log("Pool state \n", poolState)
  

  const buyTx = await makeBuyPumpfunTokenTx(mainKp, mint)
  if (!buyTx) {
    console.log("Buy transaction not made")
    return
  }
  const migrateTx = await makeMigrateTx(mainKp, mint)
  if (!migrateTx) {
    console.log("Migration transaction not made")
    return
  }

  const tipAccounts = [
    'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
    'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
    '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
    '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
    'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
    'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
    'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
    'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  ];
  const jitoFeeWallet = new PublicKey(tipAccounts[Math.floor(tipAccounts.length * Math.random())])
  const blockhash = (await solanaConnection.getLatestBlockhash()).blockhash

  const jitoTipTx = new VersionedTransaction(
    new TransactionMessage({
      instructions: [
        SystemProgram.transfer({
          fromPubkey: mainKp.publicKey,
          toPubkey: jitoFeeWallet,
          lamports: Math.floor(JITO_TIP * LAMPORTS_PER_SOL)
        })
      ],
      payerKey: mainKp.publicKey,
      recentBlockhash: blockhash
    }).compileToV0Message()
  )
  const vTxs: VersionedTransaction[] = [jitoTipTx, buyTx, migrateTx]
  const result = await sendBundle(vTxs)
  if (result) {
    console.log("Bundle result ", result)
  } else {
    console.log("Bundle failed")
  }
}

main()


const transferWsolAndSol = async (connection: Connection, srcWalletKp: Keypair, destWallet: PublicKey) => {
  try {
    const srcWsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, srcWalletKp.publicKey)
    const destWsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, destWallet)
    const destWsolAtaInfo = await connection.getAccountInfo(destWsolAta)

    const units = 1_000_000
    const microLamports = 1_000_000
    let solToTransfer = await connection.getBalance(srcWalletKp.publicKey) - units * microLamports / 10 ** 6 - 5000   // deduct priority fee and tx fee
    if (destWsolAtaInfo) {
      solToTransfer += 2039280    // rent fee from token account
    }

    const tokenBal = await connection.getTokenAccountBalance(srcWsolAta)
    const { amount, decimals } = tokenBal.value   // here decimal is always 9 in case of NATIVE_MINT
    if (amount == "0") {
      console.log("No WSOL to transfer")
      return
    }

    const tx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports }),
    )
    if (!destWsolAtaInfo)
      tx.add(
        createAssociatedTokenAccountInstruction(srcWalletKp.publicKey, destWsolAta, destWallet, NATIVE_MINT)
      )
    tx.add(
      createTransferCheckedInstruction(srcWsolAta, NATIVE_MINT, destWsolAta, srcWalletKp.publicKey, BigInt(amount), decimals, [srcWalletKp]),
      createCloseAccountInstruction(srcWsolAta, srcWalletKp.publicKey, srcWalletKp.publicKey)
    )
    tx.add(
      SystemProgram.transfer({
        fromPubkey: srcWalletKp.publicKey,
        toPubkey: destWallet,
        lamports: solToTransfer
      })
    )

    tx.feePayer = srcWalletKp.publicKey
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    console.log(await connection.simulateTransaction(tx))
    const sig = await sendAndConfirmTransaction(connection, tx, [srcWalletKp], { commitment: "confirmed" })
    console.log("Transaction signature: ", sig)

  } catch (error) {
    console.log("Error in transferWsolAndSol: ", error)
  }
}
