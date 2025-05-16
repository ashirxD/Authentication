import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null, // Stores authenticated user data (e.g., name, role, profilePicture)
  isAuthenticated: false, // Indicates if user is logged in
  role: null, // User role ('doctor' or 'patient')
  isEmailVerified: false, // Tracks email verification status
  loading: false, // Manages loading state for async actions
  error: null, // Stores error messages
  showOtpInput: false, // Controls OTP input visibility in Signup/Signin
  pendingToken: '', // Temporary token for OTP verification
  signupSuccessMessage: '', // Success messages for signup/OTP flows
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Token verification actions
    verifyTokenStart(state) {
      state.loading = true;
      state.error = null;
    },
    verifyTokenSuccess(state, action) {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = {
        ...action.payload.user,
        availability: action.payload.user.availability || { startTime: '', endTime: '', days: [] },
        profilePicture: action.payload.user.profilePicture || null,
      };
      state.role = action.payload.role;
      state.isEmailVerified = action.payload.isEmailVerified;
    },
    verifyTokenFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.user = null;
      state.role = null;
      state.showOtpInput = false;
      state.pendingToken = '';
    },
    // Login actions
    loginStart(state) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(state, action) {
      state.loading = false;
      state.showOtpInput = !!action.payload.pendingToken;
      state.pendingToken = action.payload.pendingToken || '';
    },
    loginFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.showOtpInput = false;
      state.pendingToken = '';
    },
    // OTP verification actions
    verifyOtpSuccess(state, action) {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = {
        ...action.payload.user,
        availability: action.payload.user.availability || { startTime: '', endTime: '', days: [] },
        profilePicture: action.payload.user.profilePicture || null,
      };
      state.role = action.payload.role;
      state.isEmailVerified = action.payload.isEmailVerified;
      state.showOtpInput = false;
      state.pendingToken = '';
    },
    verifyOtpFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    // OTP resend actions
    resendOtpStart(state) {
      state.loading = true;
      state.error = null;
    },
    resendOtpSuccess(state) {
      state.loading = false;
      state.signupSuccessMessage = 'A new OTP has been sent to your email.';
    },
    resendOtpFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    // Signup actions
    signupStart(state) {
      state.loading = true;
      state.error = null;
      state.signupSuccessMessage = '';
    },
    signupSuccess(state) {
      state.loading = false;
      state.showOtpInput = true;
      state.signupSuccessMessage = 'Please verify your email with the OTP sent.';
    },
    signupFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    // Email verification actions
    verifyEmailSuccess(state) {
      state.loading = false;
      state.isEmailVerified = true;
      state.showOtpInput = false;
      state.signupSuccessMessage = 'Email verified successfully! Redirecting...';
    },
    verifyEmailFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    // Availability actions
    setAvailability(state, action) {
      if (state.user) {
        state.user.availability = {
          startTime: action.payload.startTime,
          endTime: action.payload.endTime,
          days: action.payload.days,
        };
      }
    },
    clearAvailability(state) {
      if (state.user) {
        state.user.availability = { startTime: '', endTime: '', days: [] };
      }
    },
    // Profile picture update action
    updateProfilePicture(state, action) {
      if (state.user) {
        state.user.profilePicture = action.payload;
      }
    },
    // Logout action
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.role = null;
      state.isEmailVerified = false;
      state.error = null;
      state.showOtpInput = false;
      state.pendingToken = '';
      state.signupSuccessMessage = '';
    },
  },
});

export const {
  verifyTokenStart,
  verifyTokenSuccess,
  verifyTokenFailure,
  loginStart,
  loginSuccess,
  loginFailure,
  verifyOtpSuccess,
  verifyOtpFailure,
  resendOtpStart,
  resendOtpSuccess,
  resendOtpFailure,
  signupStart,
  signupSuccess,
  signupFailure,
  verifyEmailSuccess,
  verifyEmailFailure,
  setAvailability,
  clearAvailability,
  updateProfilePicture,
  logout,
} = authSlice.actions;

export default authSlice.reducer;