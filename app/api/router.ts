import express, { Request, Response } from 'express';
import multer from 'multer';
import User from "@/backend/models/usersModel";
import Meeting from "@/backend/models/meetingModel";

// Auth Handlers
import { signup } from './auth/signup/route';
import { login } from './auth/login/route';
import { logout } from './auth/logout/route';
import { getMe } from './auth/me/route';
import { verifyEmail } from './auth/verifyEmail/route';
import { forgotPassword } from './auth/forgotPassword/route';
import { resetPassword } from './auth/resetPassword/route';

// Meeting Handlers
import { createMeeting } from './meeting/create/route';
import { listMeetings } from './meeting/list/route';
import { getLiveKitToken } from './meeting/livekit/token/route';
import { uploadAudioChunk } from './meeting/audio/chunk/route';
import { finalizeAudio } from './meeting/audio/finalize/route';
import { cleanupAudio } from './meeting/audio/cleanup/route';
import { endMeeting } from './meeting/end/route';
import { leaveMeeting } from './meeting/leave/route';
import { getWaitingParticipants, updateWaitingStatus } from './meeting/waitingRoom/route';
import { getAttendance } from './meeting/attendance/[meetingId]/route';
import { uploadReport } from './meeting/uploadReport/route';
import { getMeetingByCode } from './meeting/[code]/route';

// Dashboard Handlers
import { getProfile, updateProfileAvatar } from './dashboard/profile/route';
import { uploadAvatar } from './dashboard/uploadAvatar/route';
import { getDashboardMeetingDetails } from './dashboard/meeting/[id]/route';
import { getDashboardDocuments } from './dashboard/documents/route';
import { getDocumentDetails } from './dashboard/documents/[id]/route';
import { getDashboardMOM, downloadMoM, getMOMById } from './dashboard/mom/route';

// Brainstorming Handlers
import { getSwotState, updateSwotState, deleteSwotCache } from './brainstorming/swotAnalysis/route';
import { getStickyNotesState, updateStickyNotesState, deleteStickyNotesCache } from './brainstorming/stickyNotes/route';
import { getMindmapState, updateMindmapState, deleteMindmapCache } from './brainstorming/mindmapping/route';
import { getCanvasState, updateCanvasState, deleteCanvasCache } from './brainstorming/canvas/route';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Health check route
router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'API is running' });
});

// Auth routes
router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.get('/auth/logout', logout);
router.get('/auth/me', getMe);
router.post('/auth/verifyEmail', verifyEmail);
router.post('/auth/forgotPassword', forgotPassword);
router.post('/auth/resetPassword', resetPassword);

// User Profile routes
router.get('/dashboard/profile', getProfile);
router.post('/dashboard/profile', upload.single('avatar'), updateProfileAvatar);
router.post('/dashboard/upload-avatar', upload.single('image'), uploadAvatar);

// Dashboard routes
router.get('/dashboard/documents', getDashboardDocuments);
router.get('/dashboard/documents/:id', getDocumentDetails);
router.get('/dashboard/mom', getDashboardMOM);
router.get('/dashboard/mom/download', downloadMoM);
router.get('/dashboard/mom/:id', getMOMById);
router.get('/dashboard/meeting/:id', getDashboardMeetingDetails);

// Meeting routes
router.post('/meeting/create', createMeeting);
router.get('/meeting/list', listMeetings);
router.get('/meeting/livekit/token', getLiveKitToken);
router.post('/meeting/end', endMeeting);
router.post('/meeting/leave', leaveMeeting);

// Waiting Room routes
router.get('/meeting/waiting-room', getWaitingParticipants);
router.get('/meeting/waitingRoom', getWaitingParticipants); // Alias for frontend
router.post('/meeting/waiting-room/status', updateWaitingStatus);
router.post('/meeting/waitingRoom', updateWaitingStatus); // Alias for frontend

// Attendance route
router.get('/meeting/attendance/:meetingId', getAttendance);

// Parameterized meeting route (must be last among GET /meeting/...)
router.get('/meeting/:code', getMeetingByCode);

// Audio Recording routes
router.post('/meeting/audio/chunk', upload.single('chunk'), uploadAudioChunk);
router.post('/meeting/audio/finalize', finalizeAudio);
router.post('/meeting/audio/cleanup', cleanupAudio);

// Report Upload route
router.post('/meeting/upload-report', upload.single('report'), uploadReport);
router.post('/meeting/uploadReport', upload.single('report'), uploadReport); // Alias for frontend

// Brainstorming routes
router.get('/brainstorming/swot', getSwotState);
router.post('/brainstorming/swot', updateSwotState);
router.delete('/brainstorming/swot', deleteSwotCache);
router.delete('/brainstorming/swotAnalysis', deleteSwotCache); // Alias
router.get('/brainstorming/swotAnalysis', getSwotState); // Alias
router.post('/brainstorming/swotAnalysis', updateSwotState); // Alias

router.get('/brainstorming/sticky-notes', getStickyNotesState);
router.post('/brainstorming/sticky-notes', updateStickyNotesState);
router.delete('/brainstorming/sticky-notes', deleteStickyNotesCache);
router.delete('/brainstorming/stickyNotes', deleteStickyNotesCache); // Alias
router.get('/brainstorming/stickyNotes', getStickyNotesState); // Alias
router.post('/brainstorming/stickyNotes', updateStickyNotesState); // Alias

router.get('/brainstorming/mindmap', getMindmapState);
router.post('/brainstorming/mindmap', updateMindmapState);
router.delete('/brainstorming/mindmap', deleteMindmapCache);
router.delete('/brainstorming/mindmapping', deleteMindmapCache); // Alias
router.get('/brainstorming/mindmapping', getMindmapState); // Alias
router.post('/brainstorming/mindmapping', updateMindmapState); // Alias

router.get('/brainstorming/canvas', getCanvasState);
router.post('/brainstorming/canvas', updateCanvasState);
router.delete('/brainstorming/canvas', deleteCanvasCache);

// User/Meeting count routes
router.get('/users/count', async (req: Request, res: Response) => {
    try {
        const count = await User.countDocuments();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user count' });
    }
});

router.get('/meetings/active', async (req: Request, res: Response) => {
    try {
        const activeMeetings = await Meeting.find({ status: 'active' });
        res.json(activeMeetings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch active meetings' });
    }
});

export default router;
