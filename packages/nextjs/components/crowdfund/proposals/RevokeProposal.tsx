import { useScaffoldContractWrite, useScaffoldEventSubscriber } from "~~/hooks/scaffold-eth";

interface RevokeProposalProps {
  fundRunId: number;
  proposalId: number;
}

export const RevokeProposal = (proposal: RevokeProposalProps) => {
  useScaffoldEventSubscriber({
    contractName: "CrowdFund",
    eventName: "ProposalRevoked",
    listener: logs => {
      logs.map(log => {
        const { fundRunId, proposalId, to, reason } = log.args;
        console.log(
          "📡 New Proposal REVOKED Event \nFund Run Id:",
          fundRunId,
          "Proposal Id: ",
          proposalId,
          "\nTo: ",
          to,
          "\nReason: ",
          reason,
        );
      });
    },
  });

  const { writeAsync, isLoading } = useScaffoldContractWrite({
    contractName: "CrowdFund",
    functionName: "revokeMultisigProposal",
    args: [proposal.fundRunId, proposal.proposalId],
    onBlockConfirmation: txnReceipt => {
      console.log("📦 Transaction blockHash", txnReceipt.blockHash);
    },
  });

  return (
    <>
      <td className="w-1/12 text-center md:py-4">
        <div className="tooltip tooltip-primary tooltip-left" data-tip="Only creator of proposal can revoke.">
          <button className="w-full btn btn-primary" onClick={() => writeAsync()} disabled={isLoading}>
            {isLoading ? <span className="loading loading-spinner loading-sm"></span> : <>Revoke</>}
          </button>
        </div>
      </td>
    </>
  );
};
