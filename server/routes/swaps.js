const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all swap requests for a user (both sent and received)
router.get('/user/:userId', (req, res) => {
    const userId = req.params.userId;
    
    const query = `
        SELECT sr.*, 
               u1.name as from_user_name, u1.profile_photo as from_user_photo,
               u2.name as to_user_name, u2.profile_photo as to_user_photo,
               (SELECT ROUND(AVG(rating), 1) FROM feedback WHERE to_user_id = sr.from_user_id) as from_user_rating,
               (SELECT ROUND(AVG(rating), 1) FROM feedback WHERE to_user_id = sr.to_user_id) as to_user_rating
        FROM swap_requests sr
        JOIN users u1 ON sr.from_user_id = u1.id
        JOIN users u2 ON sr.to_user_id = u2.id
        WHERE sr.from_user_id = ? OR sr.to_user_id = ?
        ORDER BY sr.created_at DESC
    `;
    
    db.query(query, [userId, userId], (err, results) => {
        if (err) return res.status(500).json({ message: "Error fetching swap requests", error: err });
        
        const formattedResults = results.map(swap => ({
            id: swap.id,
            from_user: {
                id: swap.from_user_id,
                name: swap.from_user_name,
                photo: swap.from_user_photo,
                rating: swap.from_user_rating || 0
            },
            to_user: {
                id: swap.to_user_id,
                name: swap.to_user_name,
                photo: swap.to_user_photo,
                rating: swap.to_user_rating || 0
            },
            skill_offered: swap.skill_offered,
            skill_requested: swap.skill_requested,
            status: swap.status,
            created_at: swap.created_at,
            is_sender: swap.from_user_id == userId
        }));
        
        res.json(formattedResults);
    });
});

// Create a new swap request
router.post('/', (req, res) => {
    const { from_user_id, to_user_id, skill_offered, skill_requested } = req.body;
    
    if (!from_user_id || !to_user_id || !skill_offered || !skill_requested) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    
    const swapRequest = {
        from_user_id,
        to_user_id,
        skill_offered,
        skill_requested,
        status: 'pending'
    };
    
    db.query('INSERT INTO swap_requests SET ?', swapRequest, (err, result) => {
        if (err) return res.status(500).json({ message: "Error creating swap request", error: err });
        
        res.status(201).json({
            message: "Swap request created successfully",
            requestId: result.insertId
        });
    });
});

// Update swap request status (accept/reject/cancel)
router.put('/:id/status', (req, res) => {
    const requestId = req.params.id;
    const { status, user_id } = req.body;
    
    if (!status || !['accepted', 'rejected', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
    }
    
    // First check if the user has permission to update this request
    db.query('SELECT * FROM swap_requests WHERE id = ?', [requestId], (err, results) => {
        if (err) return res.status(500).json({ message: "Error fetching swap request", error: err });
        
        if (results.length === 0) {
            return res.status(404).json({ message: "Swap request not found" });
        }
        
        const request = results[0];
        
        // Only the receiver can accept/reject, and only the sender can cancel
        if ((status === 'cancelled' && request.from_user_id != user_id) || 
            (['accepted', 'rejected'].includes(status) && request.to_user_id != user_id)) {
            return res.status(403).json({ message: "Not authorized to update this request" });
        }
        
        // Update the status
        db.query('UPDATE swap_requests SET status = ? WHERE id = ?', [status, requestId], (err, result) => {
            if (err) return res.status(500).json({ message: "Error updating swap request", error: err });
            
            res.json({ message: "Swap request updated successfully" });
        });
    });
});

// Add feedback for a completed swap
router.post('/feedback', (req, res) => {
    const { from_user_id, to_user_id, swap_id, rating, comment } = req.body;
    
    if (!from_user_id || !to_user_id || !swap_id || !rating) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }
    
    // Check if the swap exists and is accepted
    db.query('SELECT * FROM swap_requests WHERE id = ? AND status = "accepted"', [swap_id], (err, results) => {
        if (err) return res.status(500).json({ message: "Error checking swap request", error: err });
        
        if (results.length === 0) {
            return res.status(404).json({ message: "Swap request not found or not accepted" });
        }
        
        const feedback = {
            from_user_id,
            to_user_id,
            swap_id,
            rating,
            comment: comment || ''
        };
        
        db.query('INSERT INTO feedback SET ?', feedback, (err, result) => {
            if (err) return res.status(500).json({ message: "Error adding feedback", error: err });
            
            res.status(201).json({
                message: "Feedback added successfully",
                feedbackId: result.insertId
            });
        });
    });
});

// Get feedback for a user
router.get('/feedback/user/:userId', (req, res) => {
    const userId = req.params.userId;
    
    const query = `
        SELECT f.*, u.name as from_user_name, u.profile_photo as from_user_photo
        FROM feedback f
        JOIN users u ON f.from_user_id = u.id
        WHERE f.to_user_id = ?
        ORDER BY f.created_at DESC
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ message: "Error fetching feedback", error: err });
        
        res.json(results);
    });
});

module.exports = router; 