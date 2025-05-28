const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
   validate: {
     validator: function(email) {
       return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
     },
     message: 'Please enter a valid email address'
   }
  },
  password: {
    type: String,
    required: true,
   minlength: [8, 'Password must be at least 8 characters long'],
   validate: {
     validator: function(password) {
       return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password);
     },
     message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
   }
  },
}, { timestamps: true });

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
