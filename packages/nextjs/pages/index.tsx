import { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";
import { EntryPoint } from "~~/components/crowdfund/EntryPoint";

const Entry: NextPage = () => {
  return (
    <>
      <MetaHeader title="Crowd Fund V2 | a Scaffold-ETH 2 App" />
      <div className="px-6 pt-10 pb-8 shadow-xl sm:my-auto bg-secondary sm:mx-auto sm:max-w-11/12 md:w-9/12 sm:rounded-lg sm:px-10">
        <div className="flex items-center justify-center">
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-5">
            <EntryPoint />
          </div>
        </div>
      </div>
    </>
  );
};

export default Entry;
