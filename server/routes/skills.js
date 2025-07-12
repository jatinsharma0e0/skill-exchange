const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all public user profiles with skills and rating
router.get('/suggestions', (req, res) => {
    const sql = `
    SELECT u.id, u.name, u.profile_photo, u.availability, 
           GROUP_CONCAT(CASE s.type WHEN 'offered' THEN s.name END) AS skillsOffered,
           GROUP_CONCAT(CASE s.type WHEN 'wanted' THEN s.name END) AS skillsWanted,
           ROUND(AVG(f.rating), 1) AS rating
    FROM users u
    LEFT JOIN skills s ON u.id = s.user_id
    LEFT JOIN feedback f ON u.id = f.to_user_id
    WHERE u.is_private = FALSE
    GROUP BY u.id
    LIMIT 20
  `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: "Error fetching suggestions", error: err });
        res.json(results.map(user => ({
            id: user.id,
            name: user.name,
            photo: user.profile_photo,
            availability: user.availability,
            skillsOffered: user.skillsOffered ? user.skillsOffered.split(',') : [],
            skillsWanted: user.skillsWanted ? user.skillsWanted.split(',') : [],
            rating: user.rating || 0
        })));
    });
});

// Get user profile by ID
router.get('/user/:id', (req, res) => {
    const userId = req.params.id;
    
    const userQuery = `
        SELECT id, name, email, location, profile_photo, availability, is_private
        FROM users
        WHERE id = ?
    `;
    
    const skillsQuery = `
        SELECT id, type, name, tags
        FROM skills
        WHERE user_id = ?
    `;
    
    const ratingQuery = `
        SELECT ROUND(AVG(rating), 1) as average_rating
        FROM feedback
        WHERE to_user_id = ?
    `;
    
    db.query(userQuery, [userId], (err, userResults) => {
        if (err) return res.status(500).json({ message: "Error fetching user", error: err });
        if (userResults.length === 0) return res.status(404).json({ message: "User not found" });
        
        const user = userResults[0];
        
        db.query(skillsQuery, [userId], (err, skillsResults) => {
            if (err) return res.status(500).json({ message: "Error fetching skills", error: err });
            
            const skillsOffered = skillsResults.filter(skill => skill.type === 'offered');
            const skillsWanted = skillsResults.filter(skill => skill.type === 'wanted');
            
            db.query(ratingQuery, [userId], (err, ratingResults) => {
                if (err) return res.status(500).json({ message: "Error fetching rating", error: err });
                
                res.json({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    location: user.location,
                    profile_photo: user.profile_photo,
                    availability: user.availability,
                    is_private: user.is_private,
                    skillsOffered,
                    skillsWanted,
                    rating: ratingResults[0].average_rating || 0
                });
            });
        });
    });
});

// Add a new skill
router.post('/add', (req, res) => {
    const { user_id, type, name, tags } = req.body;
    
    if (!user_id || !type || !name) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    
    const skill = { user_id, type, name, tags: tags || '' };
    
    db.query('INSERT INTO skills SET ?', skill, (err, result) => {
        if (err) return res.status(500).json({ message: "Error adding skill", error: err });
        
        res.status(201).json({
            message: "Skill added successfully",
            skillId: result.insertId
        });
    });
});

// Delete a skill
router.delete('/:id', (req, res) => {
    const skillId = req.params.id;
    
    db.query('DELETE FROM skills WHERE id = ?', [skillId], (err, result) => {
        if (err) return res.status(500).json({ message: "Error deleting skill", error: err });
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Skill not found" });
        }
        
        res.json({ message: "Skill deleted successfully" });
    });
});

// Update user profile
router.put('/profile/:id', (req, res) => {
    const userId = req.params.id;
    const { name, location, availability, is_private, profile_photo } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (location) updateData.location = location;
    if (availability) updateData.availability = availability;
    if (is_private !== undefined) updateData.is_private = is_private;
    if (profile_photo) updateData.profile_photo = profile_photo;
    
    db.query('UPDATE users SET ? WHERE id = ?', [updateData, userId], (err, result) => {
        if (err) return res.status(500).json({ message: "Error updating profile", error: err });
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.json({ message: "Profile updated successfully" });
    });
});

module.exports = router;
