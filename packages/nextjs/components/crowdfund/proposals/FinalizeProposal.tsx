/* eslint-disable prettier/prettier */
import { useState } from "react";
import getNonce from "~~/helpers/getNonce";
import { useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

interface FinalizeProposalProps {
  id: number; //fundrun //todo:
  proposalId: number;
  amount: bigint;
  to: string;
  proposedBy: string;
  reason: string;
}

export const FinalizeProposal = (proposal: FinalizeProposalProps) => {
  const [nonceInput, setNonceInput] = useState<bigint>();
  const tx = { amount: proposal.amount, to: proposal.to, proposedBy: proposal.proposedBy, reason: proposal.reason };

  //todo: refactor A:1
  const { data: fundRunNonce } = useScaffoldContractRead({
    contractName: "CrowdFund",
    functionName: "getNonce",
  });

  const finishProposal = () => {
    const nonce = getNonce(fundRunNonce);
    setNonceInput(nonce);

    console.log("nonce: ", nonce);
    console.log("fund run id: ", proposal.id);
    console.log("proposal id: ", proposal.proposalId);
    console.log("amount: ", proposal.amount.toString());
    console.log("to: ", proposal.to);
    console.log("proposedBy: ", proposal.proposedBy);
    console.log("reason: ", proposal.reason);
  };

  const { writeAsync, isLoading } = useScaffoldContractWrite({
    contractName: "CrowdFund",
    functionName: "multisigWithdraw",
    args: [tx, nonceInput, proposal.id, proposal.proposalId],
    onBlockConfirmation: txnReceipt => {
      console.log("📦 Transaction blockHash", txnReceipt.blockHash);
    },
  });

  return (
    <>
      <div className="mt-12">
        <h1>Finalize THIS PROPOSAL (FinalizeProposal.tsx)</h1>

        <button className="w-10/12 mx-auto md:w-3/5 btn btn-primary mt-9" onClick={() => finishProposal()}>
          First Click
        </button>
        <button className="w-10/12 mx-auto md:w-3/5 btn btn-primary mt-9" onClick={() => writeAsync()}>
          Second Click
        </button>
      </div>
    </>
  );
};
