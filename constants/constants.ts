import { PublicKey } from "@solana/web3.js"
import { retrieveEnvVariable } from "../utils"
import { CommitmentLevel } from "@triton-one/yellowstone-grpc"

export const PRIVATE_KEY = retrieveEnvVariable('PRIVATE_KEY')
export const RPC_ENDPOINT = retrieveEnvVariable('RPC_ENDPOINT')
export const RPC_WEBSOCKET_ENDPOINT = retrieveEnvVariable('RPC_WEBSOCKET_ENDPOINT')
export const TOKEN_MINT = retrieveEnvVariable('TOKEN_MINT')
export const JITO_TIP = Number(retrieveEnvVariable('JITO_TIP'))


export const PUMP_AMM_PROGRAM_ID = new PublicKey("pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA")
export const FEE_RECIPIENT = new PublicKey("62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV")
export const GLOBAL_CONFIG = new PublicKey("ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw")
export const PROTOCOL_FEE_RECIPIENT = new PublicKey("G5UZAVbAf46s7cKWoyKu8kYTip9DGTpbLZ2qa9Aq69dP")
export const COMMITMENT = CommitmentLevel.CONFIRMED
export const DEBUG_MODE = false
