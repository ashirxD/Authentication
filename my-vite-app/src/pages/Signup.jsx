import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
  });
  const [otp, setOtp] = useState(''); // State for OTP input
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false); // Toggle OTP input
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        role: checked ? value : prev.role === value ? '' : prev.role,
      }));
    } else if (name === 'otp') {
      setOtp(value);
      setErrors((prev) => ({ ...prev, otp: '' }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setSuccessMessage('');
  };

  const validate = () => {
    const errors = {};
    if (!formData.name || formData.name.trim().length === 0) {
      errors.name = 'Name is required';
    }
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (!formData.role) {
      errors.role = 'Please select a role (Doctor or Patient)';
    }
    return errors;
  };

  const validateOtp = () => {
    const errors = {};
    if (!otp) {
      errors.otp = 'OTP is required';
    } else if (!/^\d{6}$/.test(otp)) {
      errors.otp = 'OTP must be a 6-digit number';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });

      const data = await response.json();
      console.log('Signup response:', { status: response.status, data });

      if (response.ok) {
        setSuccessMessage('Please verify your email with the OTP sent.');
        setShowOtpInput(true); // Show OTP input
      } else {
        setErrors({ server: data.message || 'Signup failed' });
      }
    } catch (error) {
      console.error('Signup request failed:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      setErrors({ server: 'Failed to connect to the server. Please check if the server is running.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    const validationErrors = validateOtp();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          otp,
        }),
      });

      const data = await response.json();
      console.log('Verify email response:', { status: response.status, data });

      if (response.ok) {
        setSuccessMessage('Email verified successfully! Redirecting to signin page...');
        setFormData({ name: '', email: '', password: '', role: '' });
        setOtp('');
        setShowOtpInput(false);
        setTimeout(() => {
          navigate('/signin');
        }, 2000);
      } else {
        setErrors({ server: data.message || 'Email verification failed' });
      }
    } catch (error) {
      console.error('Verify email request failed:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      setErrors({ server: 'Failed to connect to the server. Please check if the server is running.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 transform transition-all hover:shadow-2xl">
        <h2 className="text-3xl font-extrabold text-center text-gray-800 mb-6">
          Create Your Account
        </h2>
        {successMessage && (
          <p className="text-green-600 bg-green-100 border border-green-400 rounded-md p-3 text-center mb-6 animate-pulse">
            {successMessage}
          </p>
        )}
        {errors.server && (
          <p className="text-red-600 bg-red-100 border border-red-400 rounded-md p-3 text-center mb-6">
            {errors.server}
          </p>
        )}
        {!showOtpInput ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1 relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                />
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <div className="mt-2 flex space-x-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="doctor"
                    name="role"
                    value="doctor"
                    checked={formData.role === 'doctor'}
                    onChange={handleChange}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="doctor" className="ml-2 text-sm text-gray-700">
                    Doctor
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="patient"
                    name="role"
                    value="patient"
                    checked={formData.role === 'patient'}
                    onChange={handleChange}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="patient" className="ml-2 text-sm text-gray-700">
                    Patient
                  </label>
                </div>
              </div>
              {errors.role && (
                <p className="text-red-500 text-xs mt-1">{errors.role}</p>
              )}
            </div>
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full p-3 text-white rounded-lg shadow-md transition-all duration-300 ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-300'
                }`}
              >
                {isSubmitting ? 'Signing Up...' : 'Sign Up'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyEmail} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                Enter OTP
              </label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  id="otp"
                  name="otp"
                  value={otp}
                  onChange={handleChange}
                  className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition颜colors ${
                    errors.otp ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter 6-digit OTP"
                />
              </div>
              {errors.otp && (
                <p className="text-red-500 text-xs mt-1">{errors.otp}</p>
              )}
            </div>
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full p-3 text-white rounded-lg shadow-md transition-all duration-300 ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-300'
                }`}
              >
                {isSubmitting ? 'Verifying...' : 'Verify Email'}
              </button>
            </div>
          </form>
        )}
        <p className="text-center mt-6 text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/signin" className="text-blue-600 font-medium hover:text-blue-800 transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;