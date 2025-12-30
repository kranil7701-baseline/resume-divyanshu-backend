// controllers/resumeController.js
import Resume from '../models/Resume.js';

// Get user's resume
export const getResume = async (req, res) => {
  try {
    const resume = await Resume.findByUserId(req.user.id);
    
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    res.json({
      success: true,
      data: resume
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching resume'
    });
  }
};

// Create or update complete resume
export const saveResume = async (req, res) => {
  try {
    const {
      profile,
      experience,
      education,
      certifications,
      projects,
      skills,
      template,
      isPublic
    } = req.body;

    // Validate required profile fields
    if (!profile?.name || !profile?.email || !profile?.title) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and title are required'
      });
    }

    let resume = await Resume.findByUserId(req.user.id);

    if (resume) {
      // Update existing resume
      resume.profile = profile;
      resume.experience = experience || [];
      resume.education = education || [];
      resume.certifications = certifications || [];
      resume.projects = projects || [];
      resume.skills = skills || [];
      resume.template = template || resume.template;
      resume.isPublic = isPublic !== undefined ? isPublic : resume.isPublic;
      resume.lastUpdated = new Date();
    } else {
      // Create new resume
      resume = new Resume({
        userId: req.user.id,
        profile,
        experience: experience || [],
        education: education || [],
        certifications: certifications || [],
        projects: projects || [],
        skills: skills || [],
        template: template || 'modern',
        isPublic: isPublic || false
      });
    }

    await resume.save();

    res.json({
      success: true,
      message: 'Resume saved successfully',
      data: resume
    });
  } catch (error) {
    console.error('Save resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving resume'
    });
  }
};

// Toggle resume visibility
export const toggleVisibility = async (req, res) => {
  try {
    const { isPublic } = req.body;

    const resume = await Resume.findOneAndUpdate(
      { userId: req.user.id },
      { isPublic, lastUpdated: new Date() },
      { new: true, runValidators: true }
    );

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    res.json({
      success: true,
      message: `Resume is now ${isPublic ? 'public' : 'private'}`,
      data: resume
    });
  } catch (error) {
    console.error('Toggle visibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating visibility'
    });
  }
};

// Get public resumes
export const getPublicResumes = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    const query = { isPublic: true };
    
    if (search) {
      query.$text = { $search: search };
    }

    const resumes = await Resume.find(query)
      .populate('userId', 'name email')
      .select('profile experience education skills template createdAt completionPercentage')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Resume.countDocuments(query);

    res.json({
      success: true,
      data: resumes,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get public resumes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching public resumes'
    });
  }
};