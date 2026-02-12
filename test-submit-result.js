const { createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function submitResult() {
    const account = privateKeyToAccount('0x4facf2bad15ae89fd2cb7f16f8726548a36fc489e3ea8a10eb2edca18c61c58d');
    const wallet = createWalletClient({
        account,
        transport: http('https://testnet-rpc.monad.xyz')
    });

    const missionId = 45;
    const resultData = "The factorial of 10 is 3,628,800. Calculation: 10! = 10 × 9 × 8 × 7 × 6 × 5 × 4 × 3 × 2 × 1 = 3,628,800";
    const timestamp = String(Date.now());
    const action = 'submit-result';
    const params = { missionId, resultData };
    const message = `${action}:${JSON.stringify(params)}:${timestamp}`;

    const signature = await wallet.signMessage({
        account,
        message
    });

    const response = await fetch('https://moltiguild-api.onrender.com/api/submit-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            missionId,
            resultData,
            agentAddress: account.address,
            signature,
            timestamp
        }),
    });

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}

submitResult().catch(console.error);
