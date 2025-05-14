import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  isAuthenticated: false,
  role: null,
  isEmailVerified: false,
  loading: false,
  error: null,
  showOtpInput: false,
  pendingToken: '',
  signupSuccessMessage: '',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    verifyTokenStart(state) {
      state.loading = true;
      state.error = null;
    },
    verifyTokenSuccess(state, action) {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = {
        ...action.payload.user,
        availability: action.payload.user.availability || { startTime: "", endTime: "", days: [] },
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
    verifyOtpSuccess(state, action) {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = {
        ...action.payload.user,
        availability: action.payload.user.availability || { startTime: "", endTime: "", days: [] },
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
    updateAvailability(state, action) {
      if (state.user) {
        state.user.availability = action.payload;
      }
    },
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
  updateAvailability,
  logout,
} = authSlice.actions;
export default authSlice.reducer;