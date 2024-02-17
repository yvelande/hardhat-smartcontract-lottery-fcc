// const { network, ethers } = require("hardhat")
// const {
//     networkConfig,
//     developmentChains,
//     VERIFICATION_BLOCK_CONFIRMATIONS,
// } = require("../helper-hardhat-config")

const { verify } = require("../utils/verify")

const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")

const FUND_AMOUNT = "1000000000000000000" // 1 Ether, or 1e18 (10^18) Wei
// "1000000000000000000"

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock

    if (developmentChains.includes(network.name)) {
        // if (chainId == 31337) {
        //     // create VRFV2 Subscription
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.target
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)
        // subscriptionId = transactionReceipt.events[0].args.subId
        subscriptionId = transactionReceipt.logs[0].args.subId
        //     // Fund the subscription
        //     // Our mock makes it so we don't actually have to worry about sending fund
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }
    // const waitBlockConfirmations = developmentChains.includes(network.name)
    //     ? 1
    //     : VERIFICATION_BLOCK_CONFIRMATIONS

    // log("----------------------------------------------------")
    const args = [
        vrfCoordinatorV2Address,
        networkConfig[chainId]["raffleEntranceFee"],
        networkConfig[chainId]["gasLane"],
        subscriptionId,
        networkConfig[chainId]["callbackGasLimit"],
        networkConfig[chainId]["keepersUpdateInterval"],
    ]
    log(args)
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        // waitConfirmations: waitBlockConfirmations,
        waitBlockConfirmations: network.waitBlockConfirmations,
    })

    // Ensure the Raffle contract is a valid consumer of the VRFCoordinatorV2Mock contract.
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
    }

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        // await verify(raffle.target, args)
    }

    // log("Enter lottery with command:")
    // const networkName = network.name == "hardhat" ? "localhost" : network.name
    // log(`yarn hardhat run scripts/enterRaffle.js --network ${networkName}`)
    log("----------------------------------------------------")
}

module.exports.tags = ["all", "raffle"]
