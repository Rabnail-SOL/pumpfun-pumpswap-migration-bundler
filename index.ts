
import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  ComputeBudgetProgram,
  SystemProgram,
} from '@solana/web3.js'
import Client, {
  CommitmentLevel,
  SubscribeRequest,
  SubscribeUpdate,
  SubscribeUpdateTransaction,
} from "@triton-one/yellowstone-grpc";
import { ClientDuplexStream } from '@grpc/grpc-js';
import base58 from 'bs58'
import {
  PRIVATE_KEY,
  RPC_ENDPOINT,
  RPC_WEBSOCKET_ENDPOINT,
  TOKEN_MINT,
  POOL_ID,
  GRPC_ENDPOINT,
  PUMP_AMM_PROGRAM_ID,
  COMMITMENT,
} from './constants'
import PumpswapIDL from './contract/pumpswap-idl.json'
import PumpfunIDL from './contract/pumpfun-idl.json'
import { PumpAmm } from './contract/pumpswap-types'
import { Pump } from './contract/pumpfun-types'
import { AnchorProvider, BN, Program, setProvider } from '@coral-xyz/anchor'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { buy, getPoolsWithBaseMintQuoteWSOL, sell } from './src/swap'
import { createAssociatedTokenAccountInstruction, createCloseAccountInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync, NATIVE_MINT } from '@solana/spl-token'
import { sleep } from './utils';
import { sendAndConfirmTransaction } from '@solana/web3.js';

export const solanaConnection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment: "processed"
})

export const mainKp = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY))
const baseMint = new PublicKey(TOKEN_MINT)
const poolId = new PublicKey(POOL_ID)

const provider = new AnchorProvider(solanaConnection, new NodeWallet(Keypair.generate()))
setProvider(provider);

export const PumpswapProgram = new Program<PumpAmm>(PumpswapIDL as PumpAmm, provider);
export const PumpfunProgram = new Program<Pump>(PumpfunIDL as Pump, provider);

// const main = async () => {
//   try {

//     console.log("Main wallet address: ", mainKp.publicKey.toBase58())
//     console.log("Main wallet balance: ", (await solanaConnection.getBalance(mainKp.publicKey)) / LAMPORTS_PER_SOL, "SOL")
//     console.log("Base mint address: ", baseMint.toBase58())

//     // await buy(solanaConnection, baseMint, poolId, mainKp, new BN(10 ** 5), new BN(10 ** 8), PumpProgram)
//     // await sell(solanaConnection, baseMint, poolId, mainKp, new BN(100), new BN(1000), PumpProgram, true)
//     // const data = await getPoolsWithBaseMintQuoteWSOL(solanaConnection, baseMint, NATIVE_MINT, PumpProgram)

//     const client = new Client(GRPC_ENDPOINT, undefined, undefined);
//     const stream = await client.subscribe();
//     try {
//       const request = createSubscribeRequest();
//       await sendSubscribeRequest(stream, request);
//       console.log('Geyser connection established - watching new Pump.fun mints. \n');
//       await handleStreamEvents(stream);
//     } catch (error) {
//       console.error('Error in subscription process:', error);
//       stream.end();
//     }

//   } catch (error) {
//     console.log("Error while running main function")
//   }
// }


// function sendSubscribeRequest(
//   stream: ClientDuplexStream<SubscribeRequest, SubscribeUpdate>,
//   request: SubscribeRequest
// ): Promise<void> {
//   return new Promise<void>((resolve, reject) => {
//     stream.write(request, (err: Error | null) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve();
//       }
//     });
//   });
// }

// function handleStreamEvents(stream: ClientDuplexStream<SubscribeRequest, SubscribeUpdate>): Promise<void> {
//   return new Promise<void>((resolve, reject) => {
//     stream.on('data', async (data) => {




//       console.log(data)




//     });
//     stream.on("error", (error: Error) => {
//       console.error('Stream error:', error);
//       reject(error);
//       stream.end();
//     });
//     stream.on("end", () => {
//       console.log('Stream ended');
//       resolve();
//     });
//     stream.on("close", () => {
//       console.log('Stream closed');
//       resolve();
//     });
//   });
// }

// function createSubscribeRequest(): SubscribeRequest {
//   return {
//     accounts: {},
//     slots: {},
//     transactions: {
//       // pumpFun: {
//       //     accountInclude: [PUMP_AMM_PROGRAM_ID.toBase58()],
//       //     accountExclude: [],
//       //     accountRequired: []
//       // }
//     },
//     transactionsStatus: {},
//     entry: {},
//     blocks: {},
//     blocksMeta: {},
//     commitment: COMMITMENT,
//     accountsDataSlice: [],
//     ping: undefined,
//   };
// }

// main()



const main = async () => {
  // solanaConnection.onLogs(
  //   PUMP_AMM_PROGRAM_ID,
  //   async ({logs, err, signature}) => {
  //     if(!err){
  //       try {
  //         const logStr = JSON.stringify(logs)
  //         if(logStr.includes("MintTo") && logStr.includes("Program pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA invoke [2]")) {
  //           console.log(logStr)
  //           console.log(`\nSuccessfully created token: https://solscan.io/tx/${signature}\n`)
  //           const txData = await solanaConnection.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 })
  //           console.log("Tx data: ", txData)
  //         }
  //       } catch (error) {
  //         console.log("Error:", error)
  //       }
  //     }
  //   }
  // )

  // const launchListenerId = PumpswapProgram.addEventListener("createPoolEvent", (event, slot, signature) => {

  //   const { creator, baseMint, quoteMint, baseAmountIn, quoteAmountIn, timestamp, lpMint, pool } = event
  //   console.log("\n\n================ New Pool Created ================")
  //   console.log(`Pool creation signature: https://solscan.io/tx/${signature}`)
  //   console.log("Creator:", creator.toBase58())
  //   console.log("Pool ID:", pool.toBase58())
  //   console.log("BaseMint:", baseMint.toBase58())
  //   console.log("QuoteMint:", quoteMint.toBase58())
  //   console.log("BaseAmountIn:", baseAmountIn.toString())
  //   console.log("QuoteAmountIn:", quoteAmountIn.toString())
  //   console.log("Timestamp:", new Date(timestamp.toNumber()))
  //   console.log("Lp Mint:", lpMint.toBase58())
  //   console.log("===================================================\n\n")

  // })

  // const migrateListener = PumpfunProgram.addEventListener("completePumpAmmMigrationEvent", (event, slot, signature) => {
  //   const { creator, timestamp, pool, bondingCurve, mint } = event

  //   console.log("\n\n================ Migration event fetched ================")
  //   console.log(`Pool creation signature: https://solscan.io/tx/${signature}`)
  //   console.log("Creator: ", creator?.toBase58())
  //   console.log("Pool: ", pool?.toBase58())
  //   console.log("BondingCurve: ", bondingCurve.toBase58())
  //   console.log("Timestamp:", new Date(timestamp.toNumber()))
  //   console.log("===================================================\n\n")
  // })

  // const completeListener = PumpfunProgram.addEventListener("completeEvent", (event, slot, signature) => {
  //   const { user, timestamp, bondingCurve, mint } = event

  //   console.log("\n\n================ Migration event fetched ================")
  //   console.log(`Pool creation signature: https://solscan.io/tx/${signature}`)
  //   console.log("User: ", user?.toBase58())
  //   console.log("Mint: ", mint.toBase58())
  //   console.log("BondingCurve: ", bondingCurve.toBase58())
  //   console.log("Timestamp:", new Date(timestamp.toNumber()))
  //   console.log("===================================================\n\n")
  // })

  const tradeEvent = PumpfunProgram.addEventListener("tradeEvent", (event, slot, sig) => {
    console.log("🚀 ~ tradeEvent ~ event:", event)
  })

  // const buyListenerId = PumpProgram.addEventListener("buyEvent", (event, slot, signature) => {console.log("Buy event: \n", signature, slot, "\n", event)})
  console.log("Listener is running")
  // PumpProgram.removeEventListener(launchListenerId)
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
