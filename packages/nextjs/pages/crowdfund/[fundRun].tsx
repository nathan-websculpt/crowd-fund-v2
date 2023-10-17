import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";
import { DonorWithdrawBtn } from "~~/components/crowdfund/DonorWithdrawBtn";
import { FundRun } from "~~/components/crowdfund/FundRun";
import { OwnerWithdrawBtn } from "~~/components/crowdfund/OwnerWithdrawBtn";
import { useScaffoldContractRead, useScaffoldContractWrite, useScaffoldEventSubscriber } from "~~/hooks/scaffold-eth";

const FundRunPage: NextPage = () => {
  const router = useRouter();
  const [donationInput, setDonationInput] = useState("");
  const { fundRun } = router.query as { fundRun?: `${string}` };

  useScaffoldEventSubscriber({
    contractName: "CrowdFund",
    eventName: "DonationHappened",
    listener: logs => {
      logs.map(log => {
        const { owners, donor, amount } = log.args;
        console.log(
          "📡 New Donation Event \nFund Run Owner:",
          owners,
          "\nDonor: ",
          donor,
          "\nDonation amount: ",
          amount,
        );
      });
    },
  });

  const { data: fundRunSingle } = useScaffoldContractRead({
    contractName: "CrowdFund",
    functionName: "getFundRun",
    args: fundRun,
  });

  const { writeAsync, isLoading } = useScaffoldContractWrite({
    contractName: "CrowdFund",
    functionName: "donateToFundRun",
    args: [fundRunSingle?.id],
    onBlockConfirmation: txnReceipt => {
      console.log("📦 Transaction blockHash", txnReceipt.blockHash);
    },
    value: donationInput,
  });

  const validateThenWrite = () => {
    if (donationInput === "") {
      alert("Please input a donation amount.");
      return;
    }

    writeAsync();
  };

  return (
    <>
      <MetaHeader title="Fund Run Viewer" />
      <div className="w-full px-6 pt-10 pb-8 shadow-xl sm:my-auto bg-secondary sm:mx-auto sm:w-4/5 lg:w-2/5 sm:rounded-lg sm:px-10">
        <div className="flex justify-end mb-5">
          <Link href="/crowdfund/browse-fund-runs" passHref className="link">
            <button className="btn btn-sm btn-primary">View Other Fund Runs</button>
          </Link>
          <button className="ml-5 btn btn-sm btn-primary" onClick={() => router.back()}>
            Back
          </button>
        </div>

        <div className="flex items-center justify-center">
          <div className="flex flex-col gap-2 p-2 m-4 border shadow-xl border-base-300 bg-base-200 sm:rounded-lg">
            {fundRunSingle ? (
              <div>
                <FundRun
                  title={fundRunSingle.title}
                  description={fundRunSingle.description}
                  target={fundRunSingle.target}
                  deadline={fundRunSingle.deadline.toString()}
                  amountCollected={fundRunSingle.amountCollected}
                  amountWithdrawn={fundRunSingle.amountWithdrawn}
                  isActive={fundRunSingle.isActive}
                />

                <div className="tooltip tooltip-primary" data-tip="Donation Amount in Ether ... like '0.1' or '1'">
                  <input
                    type="number"
                    placeholder="Donation Amount"
                    className="max-w-xs input input-bordered input-accent"
                    onChange={e => setDonationInput(e.target.value)}
                  />
                </div>

                <div className="tooltip tooltip-primary" data-tip="Ready to donate Ether?">
                  <button
                    className="mt-5 ml-0 xl:ml-7 btn btn-primary"
                    onClick={() => validateThenWrite()}
                    disabled={isLoading}
                  >
                    {isLoading ? <span className="loading loading-spinner loading-sm"></span> : <>DONATE NOW</>}
                  </button>
                </div>

                <div className="flex flex-col justify-center gap-8 pt-6 mt-20 mb-5 border-t-4 sm:mt-12 sm:flex-row sm:flex-wrap">
                  <OwnerWithdrawBtn id={fundRunSingle.id} />
                  <DonorWithdrawBtn id={fundRunSingle.id} />
                </div>
              </div>
            ) : (
              <h1>Sorry! Nothing here.</h1>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default FundRunPage;
