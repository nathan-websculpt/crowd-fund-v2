//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev NOT PRODUCTION-READY ... FOR LEARNING PURPOSES ONLY
 * CrowdFund.sol is a barebones POC of a multi-user "Crowd Fund Creator"
 * known issues/enhancements saved for V2 --
 * - Fund Runs that receive 0 donations will never be de-activated
 * - FundRun struct has some bloat, but these values are handy for testing
 * - want an Enum to handle the state a FundRun is in
 * - V2 needs CrowdFund.sol to be ownable, with:
 * 		- contract profit-taking (probably 0.25% of each Donation or each Owner Withdrawal)
 * 		- only owner(s) can take profit
 * 		- only owner(s) can clean up de-activated/emptied Fund Runs ... or at least move them into an Archived state
 * 		- multi-sig functionality (thinking multi-sig Fund Runs is a cool end-goal for this project)
 */
contract CrowdFund is Ownable {
	struct FundRun {
		uint16 id; //not large enough in a prod scenario
		address owner;
		string title;
		string description;
		uint256 target;
		uint256 deadline;
		uint256 amountCollected;
		uint256 amountWithdrawn;
		address[] donors;
		uint256[] donations;
		bool isActive;
	}

	/**
	 * @dev an address _> has a DonorsLog
	 * a Donor Log _> has a mapping of
	 * FundRunId => donationAmount
	 */
	struct DonorsLog {
		address donor;
		mapping(uint256 => uint256) donorMoneyLog; //mapping(fundRunId => donationAmount)
	}

	mapping(uint256 => FundRun) public fundRuns;
	mapping(address => DonorsLog) public donorLogs; //a single donor will have all of their logs (across all Fund Runs they donated to) here
	uint16 constant private crowdFundCommission = 25; //.25% 
	uint16 constant private crowdFundDenominator = 10000;
	uint16 public numberOfFundRuns = 0;
	uint256 private commissionPayout = 0; 
	uint256 public totalProfitsTaken = 0;
	address[] public fundRunOwners;

	event FundRunCreated(
		uint16 id,
		address owner,
		string title,
		uint256 target
	);

	event DonationHappened(address owner, address donor, uint256 amount); //todo: rename to Donation

	event OwnerWithdrawal(address owner, uint256 amount);

	event DonorWithdrawal(address owner, address donor, uint256 amount);

	event contractOwnerWithdrawal(address contractOwner, uint256 amount);

	modifier ownsThisFundRun(
		uint16 id,
		address sender,
		bool senderOwnsThisFundRun
	) {
		FundRun storage fundRun = fundRuns[id];
		if (senderOwnsThisFundRun) {
			require(
				fundRun.owner == sender,
				"You are not the owner of this Fund Run."
			);
		} else {
			require(
				fundRun.owner != sender,
				"You own this Fund Run -- therefore, this operation is not allowed"
			);
		}
		_;
	}

	modifier fundRunCompleted(uint16 id, bool fundRunHasCompleted) {
		FundRun storage fundRun = fundRuns[id];
		if (fundRunHasCompleted) {
			require(
				fundRun.deadline < block.timestamp,
				"This Fund Run is not complete."
			);
		} else {
			require(
				fundRun.deadline > block.timestamp,
				"This Fund Run has already completed."
			);
		}
		_;
	}

	modifier fundRunSucceeded(uint16 id, bool fundRunHasSucceeded) {
		FundRun storage fundRun = fundRuns[id];
		if (fundRunHasSucceeded) {
			require(
				fundRun.amountCollected >= fundRun.target,
				"This Fund Run has not yet met its monetary goal."
			);
		} else {
			require(
				fundRun.amountCollected < fundRun.target,
				"This Fund Run has already met its monetary goal."
			);
		}
		_;
	}

	constructor(address _contractOwner) {
		_transferOwnership(_contractOwner);
	}

	function createFundRun(
		string memory _title,
		string memory _description,
		uint256 _target,
		uint16 _deadline
	) public {
		uint256 fundRunDeadline = block.timestamp + _deadline * 60;
		require(
			fundRunDeadline > block.timestamp,
			"The deadline would ideally be a date in the future there, Time Traveler."
		);
		bytes32 baseCompare = keccak256("");
		bytes32 titleCompare = keccak256(bytes(_title));
		bytes32 descriptionCompare = keccak256(bytes(_description));
		require(
			titleCompare != baseCompare && descriptionCompare != baseCompare,
			"Title and Description are both required fields."
		);
		require(_target > 0, "Your money target must be greater than 0.");

		address[] memory donorArray;
		uint256[] memory donationsArray;
		FundRun memory fundRun = FundRun({
			id: numberOfFundRuns,
			owner: msg.sender,
			title: _title,
			description: _description,
			target: _target,
			deadline: fundRunDeadline,
			amountCollected: 0,
			amountWithdrawn: 0,
			isActive: true,
			donors: donorArray,
			donations: donationsArray
		});

		fundRuns[numberOfFundRuns] = fundRun;
		fundRunOwners.push(msg.sender);
		numberOfFundRuns++;

		emit FundRunCreated(
			fundRun.id,
			fundRun.owner,
			fundRun.title,
			fundRun.target
		);
	}

	function donateToFundRun(
		uint16 _id
	)
		public
		payable
		ownsThisFundRun(_id, msg.sender, false)
		fundRunCompleted(_id, false)
	{
		require(msg.value > 0, "Minimum payment amount not met.");
		uint256 amount = msg.value;

		FundRun storage fundRun = fundRuns[_id];

		fundRun.donors.push(msg.sender);
		fundRun.donations.push(amount);

		/**
		 * @dev next few lines are how a person can donate to multiple fund runs (multiple times)
		 * while still keeping the donations logged separately for proper withdrawal
		 * Donor's Address _> Donor Log _> mapping(fundRunID => donationAmount)
		 * The reason this crucial mapping is not on the FundRun struct is
		 * because mappings within structs can't be sent to the front-end
		 */
		DonorsLog storage donorLog = donorLogs[msg.sender];
		if (donorLog.donor != msg.sender) donorLog.donor = msg.sender; //for first run
		uint256 previouslyDonated = donorLog.donorMoneyLog[fundRun.id];
		donorLog.donorMoneyLog[fundRun.id] = amount + previouslyDonated;
		uint256 newAmountCollected = fundRun.amountCollected + amount;
		fundRun.amountCollected = newAmountCollected;

		emit DonationHappened(fundRun.owner, msg.sender, amount);
	}

	function fundRunOwnerWithdraw(
		uint16 _id
	)
		public
		ownsThisFundRun(_id, msg.sender, true)
		fundRunCompleted(_id, true)
		fundRunSucceeded(_id, true)
	{
		FundRun storage fundRun = fundRuns[_id];
		require(fundRun.amountCollected > 0, "There is nothing to withdraw");
		require(
			fundRun.amountCollected > fundRun.amountWithdrawn,
			"This Fund Run is empty -- a withdrawal may have already occurred."
		);
		uint256 grossWithdrawAmount = fundRun.amountCollected -
			fundRun.amountWithdrawn;
		require(
			grossWithdrawAmount > 0,
			"There is nothing to withdraw -- a withdrawal may have already occurred."
		);

		/**
		 * @dev in this scenario, the amount that is previously withdrawn should always be 0
		 * So, here's some 'Redundancy' coming to you in the form of a 'Safety Measure'
		 *
		 * ADD the would-be withdrawal amount to the actual withdrawn amount
		 * and ensure they are going to be less-than/equal-to the Fund Run's total balance ("amountCollected")
		 */
		require(
			(grossWithdrawAmount + fundRun.amountWithdrawn) <=
				fundRun.amountCollected,
			"This Fund Run is hereby prevented from being over-drawn."
		);

		//contract takes its cut
		uint256 fundsMinusCommission = (grossWithdrawAmount *
			crowdFundCommission) / crowdFundDenominator; //0.25%
		uint256 netWithdrawAmount = grossWithdrawAmount - fundsMinusCommission;

		fundRun.amountWithdrawn = fundRun.amountWithdrawn + netWithdrawAmount;

		//update profit amount
		commissionPayout = commissionPayout + fundsMinusCommission;

		if (fundRun.isActive) fundRun.isActive = false;

		(bool success, ) = payable(msg.sender).call{ value: netWithdrawAmount }(
			""
		);

		require(success, "Withdrawal reverted.");
		if (success) emit OwnerWithdrawal(fundRun.owner, netWithdrawAmount);
		//TODO: Handle else. Not done yet, because how this works will change
	}

	function fundRunDonorWithdraw(
		uint16 _id
	)
		public
		ownsThisFundRun(_id, msg.sender, false)
		fundRunCompleted(_id, true)
		fundRunSucceeded(_id, false)
	{
		FundRun storage fundRun = fundRuns[_id];
		DonorsLog storage donorLog = donorLogs[msg.sender];
		uint256 amountToWithdraw = donorLog.donorMoneyLog[fundRun.id];
		require(
			amountToWithdraw > 0,
			"There is nothing to withdraw - Have you already withdrawn?"
		);

		///@dev ADD the would-be withdrawal amount to the actual withdrawn amount
		///and ensure they are going to be less-than/equal-to the Fund Run's total balance ("amountCollected")
		require(
			(amountToWithdraw + fundRun.amountWithdrawn) <=
				fundRun.amountCollected,
			"This Fund Run is hereby prevented from being over-drawn."
		);

		donorLog.donorMoneyLog[fundRun.id] = 0;

		if (fundRun.isActive) fundRun.isActive = false;
		fundRun.amountWithdrawn = fundRun.amountWithdrawn + amountToWithdraw;

		(bool success, ) = payable(msg.sender).call{ value: amountToWithdraw }(
			""
		);

		require(success, "Withdrawal reverted.");
		if (success)
			emit DonorWithdrawal(fundRun.owner, msg.sender, amountToWithdraw);
		//TODO: Handle else. Not done yet, because how this works will change
	}

	/**
	 * @dev  (OnlyOwner can) Withdraw the profits this contract has made
	 */
	function contractOwnerWithdraw() public onlyOwner {
		require(commissionPayout > 0, "Nothing to withdraw");

		uint256 amountToWithdraw = commissionPayout;
		commissionPayout = 0;
		totalProfitsTaken = totalProfitsTaken + amountToWithdraw;

		(bool success, ) = payable(msg.sender).call{ value: amountToWithdraw }(
			""
		);

		require(success, "Withdrawal reverted.");
		if (success) emit contractOwnerWithdrawal(msg.sender, amountToWithdraw);
	}

	/**
	 * @dev Returns donor and donation arrays, for a Fund Run
	 */
	function getDonors(
		uint16 _id
	) public view returns (address[] memory, uint256[] memory) {
		return (fundRuns[_id].donors, fundRuns[_id].donations);
	}

	/**
	 * @dev Returns list of Fund Runs in reverse order (latest-first)
	 */
	function getFundRuns() public view returns (FundRun[] memory) {
		FundRun[] memory allFundRuns = new FundRun[](numberOfFundRuns);

		for (uint16 i = 1; i < numberOfFundRuns + 1; i++) {
			FundRun storage item = fundRuns[numberOfFundRuns - i];
			allFundRuns[i - 1] = item;
		}
		return allFundRuns;
	}

	function getFundRun(uint16 _id) public view returns (FundRun memory) {
		FundRun storage fundRun = fundRuns[_id];
		return fundRun;
	}

	function timeLeft(uint16 _id) public view returns (uint256) {
		FundRun storage fundRun = fundRuns[_id];
		require(block.timestamp < fundRun.deadline, "It's ovaaaa");
		return fundRun.deadline - block.timestamp;
	}

	function getBalance()
		public
		view
		returns (uint256 crowdFund_contractBalance)
	{
		return address(this).balance;
	}
}
