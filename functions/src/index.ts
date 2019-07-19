import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { DocumentData } from '@google-cloud/firestore'

admin.initializeApp(functions.config().firebase)

import { playMove } from './play_move';
import { queuePlayer } from './queue_player';

// Handle queueing player
exports.queuePlayer = functions
    .region('europe-west1')
    .https
    .onRequest(async (request, response) => queuePlayer(request, response))

// Handle player's move
exports.playMove = functions
    .region('europe-west1')
    .https
    .onRequest(async (request, response) => playMove(request, response))

// Update other player on enemy's move and update both on player win
exports.notifyUser = functions
    .region('europe-west1')
    .firestore
    .document('matches/{matchId}')
    .onUpdate((change, context) => {
        const newMatch = change.after.data()
        const oldMatch = change.before.data()
        if (newMatch != null && oldMatch != null) {
            if (newMatch.joinuid != oldMatch.joinuid) {
                onMatchStart(context.params.matchId)
            }
            if (newMatch.hosttarget != oldMatch.hosttarget) {
                onMove(newMatch, context.params.matchId, true)
            }
            if (newMatch.jointarget != oldMatch.jointarget) {
                onMove(newMatch, context.params.matchId, false)
            }
            if (newMatch.winner != oldMatch.winner) {
                onWinner(newMatch, context.params.matchId)
            }
        }
        return true
    })

let matches = admin.firestore().collection('matches')
let users = admin.firestore().collection('users')

async function onMatchStart(matchId: string) {
    let match = await matches.doc(matchId).get()
    let hostDoc = await users.where('uid', '==', match.data()!.hostuid).get()
    let hostName = await hostDoc.docs[0].data().username
    let joinDoc = await users.where('uid', '==', match.data()!.joinuid).get()
    let joinName = await joinDoc.docs[0].data().username
    let messageToHost = {
        data: {
            matchid: match.id,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            messType: 'challenge',
            enemyName: joinName,
        },
        notification: {
            title: 'Match started!',
            body: joinName + ' challenged you!',
        },
        token: match.data()!.hostfcmtoken
    }
    let messageToJoin = {
        data: {
            matchid: match.id,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            messType: 'challenge',
            enemyName: hostName,
        },
        notification: {
            title: 'Match started!',
            body: hostName + ' challenged you!',
        },
        token: match.data()!.joinfcmtoken,
    }
    try {
        admin.messaging().send(messageToHost)
        console.log('message sent to host: ' + match.data()!.hostfcmtoken)
    } catch (e) {
        console.log('--- error sending message: ')
        console.log(e)
    }
    try {
        admin.messaging().send(messageToJoin)
        console.log('message sent to join: ' + match.data()!.joinfcmtoken)
    } catch (e) {
        console.log('--- error sending message: ')
        console.log(e)
    }
}

async function onMove(newMatch: DocumentData, matchId: string, hostOrJoin: boolean) {
    let message = {
        data: {
            matchid: matchId,
            enemytarget: hostOrJoin ? newMatch.hosttarget : newMatch.jointarget,
            messType: 'move',
        },
        token: hostOrJoin ? newMatch.joinfcmtoken : newMatch.hostfcmtoken
    }
    try {
        admin.messaging().send(message)
    } catch (e) {
        console.log('--- error sending message')
        console.log(e)
    }
}

async function onWinner(newMatch: DocumentData, matchId: string) {
    let messageToJoin = {
        data: {
            matchid: matchId,
            winner: newMatch.winner,
            messType: 'winner',
            winnerName: newMatch.winnerName,
        },
        token: newMatch.joinfcmtoken
    }
    let messageToHost = {
        data: {
            matchid: matchId,
            winner: newMatch.winner,
            messType: 'winner',
            winnerName: newMatch.winnerName,
        },
        token: newMatch.hostfcmtoken
    }
    try {
        admin.messaging().send(messageToJoin)
    } catch (e) {
        console.log('--- error sending message')
        console.log(e)
    }
    try {
        admin.messaging().send(messageToHost)
    } catch (e) {
        console.log('--- error sending message')
        console.log(e)
    }
}
