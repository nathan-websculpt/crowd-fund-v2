import { useScaffoldContractWrite, useScaffoldEventSubscriber } from "~~/hooks/scaffold-eth";

interface OwnerProps {
  id: number;
}

export const DonorWithdrawBtn = (owner: OwnerProps) => {
  useScaffoldEventSubscriber({
    contractName: "CrowdFund",
    eventName: "DonorWithdrawal",
    listener: logs => {
      logs.map(log => {
        const { owners, donor, amount } = log.args;
        console.log(
          "📡 New Donor Withdrawal Event \nFund Run Owner:",
          owners,
          "\nDonor: ",
          donor,
          "\nWithdrawal Amount: ",
          amount,
        );
      });
    },
  });

  const { writeAsync, isLoading } = useScaffoldContractWrite({
    contractName: "CrowdFund",
    functionName: "fundRunDonorWithdraw",
    args: [owner.id],
    onBlockConfirmation: txnReceipt => {
      console.log("📦 Transaction blockHash", txnReceipt.blockHash);
    },
  });

  return (
    <>
      <button className="btn btn-primary" onClick={() => writeAsync()} disabled={isLoading}>
        {isLoading ? <span className="loading loading-spinner loading-sm"></span> : <>Donor Withdraw</>}
      </button>
    </>
  );
};
