/* eslint-disable prettier/prettier */
import { useState } from "react";
// todo: full migration to viem?
import { SignMessageReturnType, toBytes, encodePacked, keccak256, parseEther, encodeAbiParameters, parseAbiParameters } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { useScaffoldContractRead, useScaffoldContractWrite, useScaffoldEventSubscriber } from "~~/hooks/scaffold-eth";

// ethers _> viem 
// arrayify becomes: toBytes
// abiCoder.encode becomes: encodeAbiParameters
// solidityPack becomes: encodePacked

interface CreateProposalProps {
  id: number; //todo:
}

export const CreateProposal = (proposal: CreateProposalProps) => {
  const userAddress = useAccount();
  const [transferInput, setTransferInput] = useState("0.1");
  const [toAddressInput, setToAddressInput] = useState("0xcE62856Bc18E3d0f202e0f13C0B178026B94626F");
  const [reasonInput, setReasonInput] = useState("test proposal");
  const [creationSignature, setCreationSignature] = useState<SignMessageReturnType>();

  const { data: walletClient } = useWalletClient();

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

  //todo: refactor A:1
  const { data: fundRunNonce } = useScaffoldContractRead({
    contractName: "CrowdFund",
    functionName: "getNonce",
  });
  const getNewNonce = () => {
    return fundRunNonce !== undefined ? fundRunNonce + 1n : 0n;
  }; //todo: refactor
  const getDigest = async (nonce: bigint, amount: bigint, to: string, proposedBy: string, reason: string) => {
    const tx = { amount, to, proposedBy, reason };

    console.log("getDigest amount: ", amount.toString());
    console.log("getDigest to: ", to);
    console.log("getDigest proposedBy: ", proposedBy);
    console.log("getDigest reason: ", reason);

    const encoded = encodeAbiParameters(
      parseAbiParameters("uint256 amount, address to, address proposedBy, string reason"),
      [tx.amount, tx.to, tx.proposedBy, tx.reason],
    );
    const encodedWithNonce = encodePacked(["bytes", "uint256"], [encoded, nonce]);

    const digest = keccak256(encodedWithNonce);
    return digest;
  }; //todo: refactor A:1

  const createNewProposal = async () => {
    const nonce = getNewNonce();
    const digest = await getDigest(nonce, parseEther(transferInput), toAddressInput, userAddress.address, reasonInput);
    console.log("digest", digest);
    console.log("digest, made w/ wallet client", walletClient?.account);
    console.log("digest, made w/ user addr: ", userAddress.address);
    console.log("digest, made w/ to addr: ", toAddressInput);
    console.log("digest, made w/ amt: ", parseEther(transferInput).toString());

    const proposalCreationSig: any = await walletClient?.signMessage({
      account: walletClient.account,
      message: { raw: toBytes(digest) },
    });
    console.log(proposalCreationSig);

    setCreationSignature(proposalCreationSig);
    // writeAsync();
  };
  const { writeAsync, isLoading } = useScaffoldContractWrite({
    contractName: "CrowdFund",
    functionName: "createMultisigProposal",
    args: [
      creationSignature,
      proposal?.id,
      {
        amount: parseEther(transferInput),
        to: toAddressInput,
        proposedBy: userAddress.address,
        reason: reasonInput,
      },
    ],
    onBlockConfirmation: txnReceipt => {
      console.log("📦 Transaction blockHash", txnReceipt.blockHash);
    },
  });
  const testtest = () => {
    console.log("fund run id: ", proposal?.id);
    console.log("using signature: ", creationSignature);
    writeAsync();
  };

  return (
    <>
      <div className="mb-12">
        <h1>CREATE A PROPOSAL (CreateProposal.tsx)</h1>
        <label className="mt-3 text-lg font-bold">To Address</label>
        <input
          type="text"
          placeholder="To Address"
          className="px-3 py-3 border rounded-lg bg-base-200 border-base-300"
          value={toAddressInput}
          onChange={e => setToAddressInput(e.target.value)}
        />{" "}
        <label className="mt-3 text-lg font-bold">Reason</label>
        <input
          type="text"
          placeholder="Reason"
          className="px-3 py-3 border rounded-lg bg-base-200 border-base-300"
          value={reasonInput}
          onChange={e => setReasonInput(e.target.value)}
        />{" "}
        <div className="mt-4 tooltip tooltip-primary" data-tip="Transfer amount in Ether ... like '0.1' or '1'">
          <input
            type="number"
            placeholder="Transfer Amount"
            className="max-w-xs input input-bordered input-accent"
            value={transferInput}
            onChange={e => setTransferInput(e.target.value)}
          />
        </div>
        <button className="w-10/12 mx-auto mt-5 md:w-3/5 btn btn-primary" onClick={() => createNewProposal()}>
          {/* Create a Proposal */}
          First Click
        </button>
        <button className="w-10/12 mx-auto md:w-3/5 btn btn-primary mt-9" onClick={() => testtest()}>
          Second Click
        </button>
      </div>
    </>
  );
};