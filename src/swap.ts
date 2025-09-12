import { ComputeBudgetProgram, Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { BN, Program } from "@coral-xyz/anchor";
import { GLOBAL_CONFIG, PROTOCOL_FEE_RECIPIENT, PUMP_AMM_PROGRAM_ID } from "../constants";
import { createAssociatedTokenAccountIdempotentInstruction, createCloseAccountInstruction, createSyncNativeInstruction, getAssociatedTokenAddressSync, NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { sendAndConfirmTransaction } from "@solana/web3.js";
import { PumpSwap } from "../contract/pumpswap";

export const buy = async (
  connection: Connection,
  token: PublicKey,
  poolAddress: PublicKey,
  buyerKp: Keypair,
  buyAmount: BN,
  maxQuoteIn: BN,
  PumpProgram: Program<PumpSwap>,
  quoteToken: PublicKey = NATIVE_MINT,
  tokenProgram: PublicKey = TOKEN_PROGRAM_ID,
  quoteTokenProgram: PublicKey = TOKEN_PROGRAM_ID
) => {
  const tokenAta = getAssociatedTokenAddressSync(token, buyerKp.publicKey)
  const quoteAta = getAssociatedTokenAddressSync(quoteToken, buyerKp.publicKey)
  // const pool = PublicKey.findProgramAddressSync(
  //   [Buffer.from("pool"), new BN(t).toArrayLike(Buffer, "le", 2), e.toBuffer(), n.toBuffer(), o.toBuffer()], 
  //   new PublicKey("pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA")
  // )
  const buyTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 120_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 20_000 }),
    createAssociatedTokenAccountIdempotentInstruction(
      buyerKp.publicKey,
      tokenAta,
      buyerKp.publicKey,
      token,
      tokenProgram
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      buyerKp.publicKey,
      quoteAta,
      buyerKp.publicKey,
      quoteToken,
      quoteTokenProgram
    ),
    SystemProgram.transfer({
      fromPubkey: buyerKp.publicKey,
      toPubkey: quoteAta,
      lamports: buyAmount.toNumber()
    }),
    createSyncNativeInstruction(quoteAta, quoteTokenProgram),
    await PumpProgram.methods
      .buy(buyAmount, maxQuoteIn)
      .accounts({
        user: buyerKp.publicKey,
        userBaseTokenAccount: tokenAta,
        userQuoteTokenAccount: quoteAta,
        baseTokenProgram: tokenProgram,
        quoteTokenProgram: quoteTokenProgram,
        globalConfig: GLOBAL_CONFIG,
        pool: poolAddress,
        program: PUMP_AMM_PROGRAM_ID,
        protocolFeeRecipient: PROTOCOL_FEE_RECIPIENT
      })
      .instruction(),
    createCloseAccountInstruction(quoteAta, buyerKp.publicKey, buyerKp.publicKey)
  )

  const blockhash = await connection.getLatestBlockhash()
  buyTx.recentBlockhash = blockhash.blockhash
  buyTx.feePayer = buyerKp.publicKey
  console.log(await connection.simulateTransaction(buyTx))
  const sig = await sendAndConfirmTransaction(connection, buyTx, [buyerKp])
  console.log(`Buy transaction signature: https://solscan.io/tx/${sig}`)
}

export const sell = async (
  connection: Connection,
  token: PublicKey,
  poolAddress: PublicKey,
  sellerKp: Keypair,
  sellTokenAmount: BN,
  minQuoteOut: BN,
  PumpProgram: Program<PumpSwap>,
  sellAll: boolean = false,
  quoteToken: PublicKey = NATIVE_MINT,
  tokenProgram: PublicKey = TOKEN_PROGRAM_ID,
  quoteTokenProgram: PublicKey = TOKEN_PROGRAM_ID
) => {
  const tokenAta = getAssociatedTokenAddressSync(token, sellerKp.publicKey)
  const tokenBalance = await connection.getTokenAccountBalance(tokenAta)
  const amount = sellAll ? new BN(tokenBalance.value.amount) : sellTokenAmount
  const quoteAta = getAssociatedTokenAddressSync(quoteToken, sellerKp.publicKey)

  const sellTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 20_000 }),
    createAssociatedTokenAccountIdempotentInstruction(
      sellerKp.publicKey,
      quoteAta,
      sellerKp.publicKey,
      quoteToken,
      quoteTokenProgram
    ),
    await PumpProgram.methods
      .sell(new BN(amount), minQuoteOut)
      .accounts({
        user: sellerKp.publicKey,
        userBaseTokenAccount: tokenAta,
        userQuoteTokenAccount: quoteAta,
        baseTokenProgram: tokenProgram,
        quoteTokenProgram: quoteTokenProgram,
        globalConfig: GLOBAL_CONFIG,
        pool: poolAddress,
        program: PUMP_AMM_PROGRAM_ID,
        protocolFeeRecipient: PROTOCOL_FEE_RECIPIENT
      })
      .instruction(),
    createCloseAccountInstruction(quoteAta, sellerKp.publicKey, sellerKp.publicKey)
  )

  if (sellAll)
    sellTx.add(
      createCloseAccountInstruction(tokenAta, sellerKp.publicKey, sellerKp.publicKey)
    )

  const blockhash = await connection.getLatestBlockhash()
  sellTx.recentBlockhash = blockhash.blockhash
  sellTx.feePayer = sellerKp.publicKey
  console.log(await connection.simulateTransaction(sellTx))
  const sig = await sendAndConfirmTransaction(connection, sellTx, [sellerKp])
  console.log(`Sell transaction signature: https://solscan.io/tx/${sig}`)
}
