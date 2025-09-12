
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
