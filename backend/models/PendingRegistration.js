const mongoose = require('mongoose');
const crypto = require('crypto');

const pendingRegistrationSchema = new mongoose.Schema({
    kullaniciAdi: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    sifre: {
        type: String,
        required: true
    },
    otpCode: {
        type: String,
        required: true
    },
    otpExpire: {
        type: Date,
        required: true
    }
}, { timestamps: true });

pendingRegistrationSchema.methods.getOtpCode = function () {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    this.otpCode = crypto.createHash('sha256').update(otpCode).digest('hex');
    this.otpExpire = Date.now() + 10 * 60 * 1000;
    return otpCode;
};

module.exports = mongoose.model('PendingRegistration', pendingRegistrationSchema);
