import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { ComputeBudgetProgram, Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js"
import PumpfunIDL from '../contract/pumpfun-idl.json'
import { Pump } from '../contract/pumpfun-types'
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { BN } from "bn.js";
import { FEE_RECIPIENT, RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT } from "../constants";
import { createTokenMetadata } from "@pumpswap-sdk4/metadata";
import { openAsBlob } from "fs";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

const solanaConnection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment: "processed"
})
const provider = new AnchorProvider(solanaConnection, new NodeWallet(Keypair.generate()))
export const PumpfunProgram = new Program<Pump>(PumpfunIDL as Pump, provider);

export const makeBuyPumpfunTokenTx = async (mainKp: Keypair, mint: PublicKey) => {
  try {
    const associatedUser = getAssociatedTokenAddressSync(mint, mainKp.publicKey)
    const buyIx = await PumpfunProgram.methods
      .buy(new BN(1000), new BN(10000), { "0": true })
      .accounts({
        associatedUser,
        feeRecipient: FEE_RECIPIENT,
        mint,
        user: mainKp.publicKey
      })
      .instruction()

    const blockhash = (await solanaConnection.getLatestBlockhash()).blockhash

    const msg = new TransactionMessage({
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
        createAssociatedTokenAccountIdempotentInstruction(mainKp.publicKey, associatedUser, mainKp.publicKey, mint),
        buyIx
      ],
      payerKey: mainKp.publicKey,
      recentBlockhash: blockhash
    }).compileToV0Message()

    const buyVTx = new VersionedTransaction(msg)
    buyVTx.sign([mainKp])

    console.log(await solanaConnection.simulateTransaction(buyVTx, { sigVerify: true }))
    return buyVTx
  } catch (error) {
    console.log("Error while making buy transaction in pumpfun")
    return null
  }
}

export const makeMigrateTx = async (mainKp: Keypair, mint: PublicKey) => {
  try {
    await createTokenMetadata({
      name: "CDS",
      symbol: "CDS",
      description: "CDS corn dog spud",
      file: await openAsBlob("./src/1.jpg"),
      telegram: "https://t.me",
      twitter: "https://twitter.com/",
      website: "https://my_site.com"
    });
    
    const migrateIx = await PumpfunProgram.methods
      .migrate()
      .accounts({
        mint,
        program: TOKEN_PROGRAM_ID,
        user: mainKp.publicKey
      })
      .instruction()

    const blockhash = (await solanaConnection.getLatestBlockhash()).blockhash

    const msg = new TransactionMessage({
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
        migrateIx
      ],
      payerKey: mainKp.publicKey,
      recentBlockhash: blockhash
    }).compileToV0Message()

    const migrateTx = new VersionedTransaction(msg)
    migrateTx.sign([mainKp])

    console.log(await solanaConnection.simulateTransaction(migrateTx, { sigVerify: true }))
    return migrateTx
  } catch (error) {
    console.log("Error while making migration transaction in pumpfun")
    return null
  }
}
