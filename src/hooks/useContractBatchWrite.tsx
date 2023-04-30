import { useBatchSendTransaction } from "./useBatchSendTransaction";

export const useContractBatchWrite = (config: Parameters<typeof useBatchSendTransaction>[0]) => {
    const {
        sendTransaction: write,
        sendTransactionAsync: writeAsync,
        ...result
    } = useBatchSendTransaction(config)
    return {
        write,
        writeAsync,
        ...result
    }
}
