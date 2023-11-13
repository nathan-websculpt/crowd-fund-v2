import { useEffect, useState } from "react";
import router from "next/router";
import { SignMessageReturnType, parseEther, toBytes } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import getDigest from "~~/helpers/getDigest";
import getNonce from "~~/helpers/getNonce";
import { useScaffoldContractRead, useScaffoldContractWrite, useScaffoldEventSubscriber } from "~~/hooks/scaffold-eth";

interface CreateProposalProps {
  fundRunId: number;
  title: string;
}

export const CreateProposal = (fundRun: CreateProposalProps) => {
  const userAddress = useAccount();
  const [transferInput, setTransferInput] = useState("0.1");
  const [toAddressInput, setToAddressInput] = useState("");
  const [reasonInput, setReasonInput] = useState("test proposal");
  const [creationSignature, setCreationSignature] = useState<SignMessageReturnType>();

  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    if (creationSignature !== undefined) {
      writeAsync();
    }
  }, [creationSignature]);

  useScaffoldEventSubscriber({
    contractName: "CrowdFund",
    eventName: "ProposalCreated",
    listener: logs => {
      logs.map(log => {
        const { proposedBy, fundRunId, proposalId } = log.args;
        console.log(
          "📡 New Proposal Creation Event \nProposed By:",
          proposedBy,
          "Fund Run Id: ",
          fundRunId,
          "\nProposal Id: ",
          proposalId,
        );
      });
    },
  });

  const { data: fundRunNonce } = useScaffoldContractRead({
    contractName: "CrowdFund",
    functionName: "getNonce",
    args: [fundRun.fundRunId],
  });

  const signNewProposal = async () => {
    const nonce = getNonce(fundRunNonce);
    const digest = await getDigest(nonce, parseEther(transferInput), toAddressInput, userAddress.address, reasonInput);

    const proposalCreationSig: any = await walletClient?.signMessage({
      account: walletClient.account,
      message: { raw: toBytes(digest) },
    });
    setCreationSignature(proposalCreationSig);
  };

  const { writeAsync, isLoading } = useScaffoldContractWrite({
    contractName: "CrowdFund",
    functionName: "createMultisigProposal",
    args: [
      creationSignature,
      fundRun?.fundRunId,
      {
        amount: parseEther(transferInput),
        to: toAddressInput,
        proposedBy: userAddress.address,
        reason: reasonInput,
      },
    ],
    onBlockConfirmation: txnReceipt => {
      console.log("📦 Transaction blockHash", txnReceipt.blockHash);
      setCreationSignature(undefined);
    },
    onError: err => {
      console.log("Transaction Error Message", err?.message);
      setCreationSignature(undefined);
    },
  });

  return (
    <>
      <div className="flex flex-col gap-2 sm:gap-5">
        <div className="flex justify-start mb-5">
          <button className="btn btn-sm btn-primary" onClick={() => router.back()}>
            Back
          </button>
        </div>
        <div className="flex mb-5">
          <label className="mr-2 text-lg font-bold underline">Fund Run Title:</label>
          <p className="m-0 text-lg">{fundRun.title}</p>
        </div>
        <h1 className="mb-0 text-xl">Create a New Proposal</h1>
        <h4 className="mt-0 mb-4 text-lg">
          Note: You have to handle proposals in order. If one proposal is not finalized before another is created, the
          nonce will be off (for the unfinished proposal); however, each of these vaults has its own nonce, so they do
          not interfere with each other.
        </h4>
        <label className="text-lg font-bold">To Address</label>
        <input
          type="text"
          placeholder="To Address"
          className="px-3 py-3 border rounded-lg bg-base-200 border-base-300"
          value={toAddressInput}
          onChange={e => setToAddressInput(e.target.value)}
        />{" "}
        <div className="sm:gap-5 sm:flex sm:flex-row">
          <div className="flex flex-col">
            <label className="text-lg font-bold">Reason</label>
            <input
              type="text"
              placeholder="Reason"
              className="px-3 py-3 border rounded-lg bg-base-200 border-base-300"
              value={reasonInput}
              onChange={e => setReasonInput(e.target.value)}
            />{" "}
          </div>

          <div className="flex flex-col mt-4 sm:mt-0">
            <label className="text-lg font-bold">Amount</label>
            <input
              type="number"
              placeholder="Transfer Amount"
              className="px-3 py-3 border rounded-lg bg-base-200 border-base-300"
              value={transferInput}
              onChange={e => setTransferInput(e.target.value)}
            />
          </div>
        </div>
        <button
          className="w-10/12 mx-auto md:w-3/5 btn btn-primary"
          onClick={() => signNewProposal()}
          disabled={isLoading}
        >
          {isLoading ? <span className="loading loading-spinner loading-sm"></span> : <>Submit Proposal</>}
        </button>
      </div>
    </>
  );
};
