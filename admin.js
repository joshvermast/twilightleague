import { 
    collection, 
    doc, 
    setDoc, 
    updateDoc, 
    arrayUnion, 
    getDoc, 
    getDocs, 
    onSnapshot, 
    writeBatch, 
    getFirestore, 
    connectFirestoreEmulator, 
    deleteField, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";

const firebaseConfig = {
    apiKey: "AIzaSyCsyQ99puVexPdpA_4EdxUpPwr_t3ZqaWo",
    authDomain: "testtwilight-41886.firebaseapp.com",
    projectId: "testtwilight-41886",
    storageBucket: "testtwilight-41886.appspot.com",
    messagingSenderId: "25812564985",
    appId: "1:25812564985:web:f74a9df7ac8de9cc4fdb28"
};

let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

const db = getFirestore(app);

connectFirestoreEmulator(db, '127.0.0.1', 8080);

document.getElementById('admin-page-link').addEventListener('click', showAdminPage);

async function showAdminPage() {
    console.log('Navigated to Admin Page.');

    const contentDiv = document.getElementById('content');
    if (!contentDiv) {
        console.error('Error: Content div with id "content" not found.');
        return;
    }

    contentDiv.innerHTML = '<h2>Admin Page: Edit Teams and Players</h2><p>Loading data...</p>';

    try {
        const [teamsSnapshot, playersDocSnap] = await Promise.all([
            getDocs(collection(db, "teams")),
            getDoc(doc(db, "config", "players"))
        ]);

        const teams = [];
        const playersData = playersDocSnap.data() || {};

        console.log('Players Data:', playersData);
        if (Object.keys(playersData).length === 0) {
            console.warn("No players found in the 'config.players' document.");
            showInPageAlert("No players found to update.");
            return;
        }

        teamsSnapshot.forEach(docSnap => {
            const teamData = docSnap.data();
            teams.push({ id: docSnap.id, ...teamData });
        });

        let adminHTML = '';

        teams.forEach(team => {
            let teamNumber = team.id.split('_')[1] || 'N/A';

            adminHTML += `
                <div class="team-table mb-4">
                    <h3>Team ${teamNumber}</h3>
                    <div class="d-flex align-items-center mb-2">
                        <input type="text" id="team-name-${team.id}" value="${team.name}" class="form-control w-50 me-2">
                        <button class="btn btn-primary" onclick="updateTeam('${team.id}')">Save Name</button>
                    </div>
                    <table class="table table-striped table-bordered">
                        <thead>
                            <tr>
                                <th>Player Name</th>
                                <th>Preseason Scores</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            team.players.forEach(playerId => {
                const player = playersData[playerId];
                if (player) {
                    const lastScores = player.last_scores || {};

                    adminHTML += `
                        <tr>
                            <td>
                                <input type="text" id="player-name-${playerId}" value="${player.name}" class="form-control">
                            </td>
                            <td>
                                <input type="number" id="score-1-${playerId}" value="${lastScores.score_1 || 0}" class="form-control mb-2" min="0" placeholder="Score 1">
                                <input type="number" id="score-2-${playerId}" value="${lastScores.score_2 || 0}" class="form-control mb-2" min="0" placeholder="Score 2">
                                <input type="number" id="score-3-${playerId}" value="${lastScores.score_3 || 0}" class="form-control mb-2" min="0" placeholder="Score 3">
                                <input type="number" id="score-4-${playerId}" value="${lastScores.score_4 || 0}" class="form-control mb-2" min="0" placeholder="Score 4">
                                <input type="number" id="score-5-${playerId}" value="${lastScores.score_5 || 0}" class="form-control" min="0" placeholder="Score 5">
                            </td>
                            <td>
                                <button class="btn btn-primary" onclick="updatePlayer('${playerId}')">Save Player</button>
                            </td>
                        </tr>
                    `;
                }
            });

            adminHTML += `
                        </tbody>
                    </table>
                </div>
            `;
        });

        contentDiv.innerHTML = adminHTML;

    } catch (error) {
        console.error('Error loading Admin Page:', error);
        contentDiv.innerHTML = `<p class="text-danger">An error occurred while loading the Admin Page. Please try again later.</p>`;
    }
}

window.updatePlayer = async function(playerId) {
    try {
        const newName = document.getElementById(`player-name-${playerId}`).value;

        const score1 = parseInt(document.getElementById(`score-1-${playerId}`).value, 10);
        const score2 = parseInt(document.getElementById(`score-2-${playerId}`).value, 10);
        const score3 = parseInt(document.getElementById(`score-3-${playerId}`).value, 10);
        const score4 = parseInt(document.getElementById(`score-4-${playerId}`).value, 10);
        const score5 = parseInt(document.getElementById(`score-5-${playerId}`).value, 10);

        const lastScores = {
            score_1: isNaN(score1) ? 0 : score1,
            score_2: isNaN(score2) ? 0 : score2,
            score_3: isNaN(score3) ? 0 : score3,
            score_4: isNaN(score4) ? 0 : score4,
            score_5: isNaN(score5) ? 0 : score5
        };

        const validScores = Object.values(lastScores).map(score => score - 36).filter(score => !isNaN(score) && score !== 0);

        validScores.sort((a, b) => a - b);
        const bestThreeScores = validScores.slice(0, 3);

        const newBaseHandicap = bestThreeScores.length > 0 
            ? Math.round(bestThreeScores.reduce((a, b) => a + b, 0) / bestThreeScores.length)
            : 0;

        if (newName) {
            const playerRef = doc(db, "config", "players");

            await updateDoc(playerRef, {
                [`${playerId}.name`]: newName,
                [`${playerId}.last_scores`]: lastScores,
                [`${playerId}.base_handicap`]: newBaseHandicap
            });

            alert('Player data updated successfully.');
            console.log(`Updated player ${playerId}: Name - ${newName}, Last Scores - ${JSON.stringify(lastScores)}, Base Handicap - ${newBaseHandicap}`);
        } else {
            alert('Please enter valid data.');
        }
    } catch (error) {
        console.error('Error updating player data:', error);
        alert('An error occurred while updating player data. Please try again.');
    }
};

window.updateTeam = async function(teamId) {
    try {
        const newTeamName = document.getElementById(`team-name-${teamId}`).value.trim();

        if (newTeamName === "") {
            alert('Team name cannot be empty.');
            return;
        }

        const teamRef = doc(db, "teams", teamId);

        await updateDoc(teamRef, {
            name: newTeamName
        });

        alert('Team name updated successfully.');
        console.log(`Updated team ${teamId}: New Name - ${newTeamName}`);

        showAdminPage();

    } catch (error) {
        console.error('Error updating team name:', error);
        alert('An error occurred while updating the team name. Please try again.');
    }
};

