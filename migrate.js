require("dotenv").config();
const dbs = require("./mysql").dbs;

const conn = dbs[0];

///
/// spaces migration
///
const query = `
    SELECT * FROM spaces`;

try {
    conn.queryAsync(query).then((rows) => {
        rows.forEach(async row => {
            const settings = {
                title: row.name,
                name: row.name,
                network: row.network,
                symbol: row.symbol,
                strategies: JSON.parse(row.strategies),
                members: JSON.parse(row.members),
                filters: row.filters ? JSON.parse(row.filters) : null,
            };
            const ts = (Date.now() / 1e3).toFixed();
            const query =
                'INSERT IGNORE INTO spaces SET ? ON DUPLICATE KEY UPDATE updated_at = ?, settings = ?';
            await dbs[1].queryAsync(query, [
                {
                    id: row.id,
                    created_at: ts,
                    updated_at: ts,
                    settings: JSON.stringify(settings)
                },
                ts,
                JSON.stringify(settings)
            ]);
        });
    });
    console.log("Done");
} catch (e) {
    console.log('[graphql]', e);
}

///
/// messages migration
///
const messagesQuery = `
    SELECT * FROM messages`;

try {
    conn.queryAsync(messagesQuery).then(async (rows) => {
        const proposals = [];
        const votes = [];
        await Promise.all(rows.map(async row => {
            const rowEntry = {
                id: row.id,
                ipfs: JSON.parse(row.metadata).relayer_ipfs_hash,
                address: row.address,
                version: row.version,
                timestamp: row.timestamp,
                space: row.space,
                type: row.type,
                sig: row.sig,
                receipt: JSON.parse(row.metadata).relayer_ipfs_hash,
            };
            // const query =
            //     'INSERT IGNORE INTO messages SET ?';
            // await dbs[1].queryAsync(query, [
            //     rowEntry
            // ]);

            if (row.type === "proposal") {
                const payload = JSON.parse(row.payload);
                const ts = (Date.now() / 1e3).toFixed();

                const proposal = {
                    id: row.id,
                    ipfs: row.id,
                    author: row.address,
                    space: row.space,
                    type: payload.metadata.voting || "single",
                    strategies: JSON.stringify(payload.metadata.strategies),
                    title: payload.name,
                    body: payload.body,
                    choices: JSON.stringify(payload.choices),
                    start: payload.start,
                    end: payload.end,
                    snapshot: payload.snapshot,
                    created: ts,
                }

                proposals.push(proposal);
            }
            else {
                const payload = JSON.parse(row.payload);
                const ts = (Date.now() / 1e3).toFixed();

                const vote = {
                    id: row.id,
                    ipfs: payload.proposal,
                    voter: row.address,
                    created: ts,
                    space: row.space,
                    proposal: payload.proposal,
                    choice: JSON.stringify(payload.choice),
                    metadata: JSON.stringify(payload.metadata)
                }

                votes.push(vote);
            }
            return Promise.resolve();
        }));

        await Promise.all(proposals.map(async proposal => {
            const query =
                'INSERT IGNORE INTO proposals SET ?';
            await dbs[1].queryAsync(query, [
                proposal
            ]);
            return Promise.resolve();
        }));

        await Promise.all(votes.map(async vote => {
            const query =
                'INSERT IGNORE INTO votes SET ?';
            await dbs[1].queryAsync(query, [
                vote
            ]);
            return Promise.resolve();
        }));

        console.log("All migration tasks completed successfully (Ctrl + C to end)")

    });
    console.log("Done");
} catch (e) {
    console.log('[graphql]', e);
}

///
/// proposal vs votes
///