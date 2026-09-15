import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { FaEnvelope, FaLock, FaUser } from "react-icons/fa";
import { toast } from "react-toastify";

function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      toast.success("Registered successfully! You can now log in.", {
        autoClose: 2000,
      });
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed", {
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white flex items-center justify-center">
      <motion.div
        className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl w-[95%] max-w-md p-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center mb-6">
          <div className="bg-white p-3 rounded-full shadow mb-2">
            <FaUser className="text-2xl text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Create your account</h2>
          <p className="text-sm text-gray-500 text-center mt-1">
            Start your sustainable journey with us!
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="flex items-center bg-white border rounded px-3 py-2 shadow-sm">
            <FaUser className="text-gray-400 mr-2" />
            <input
              type="text"
              name="name"
              placeholder="Name"
              className="outline-none w-full"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex items-center bg-white border rounded px-3 py-2 shadow-sm">
            <FaEnvelope className="text-gray-400 mr-2" />
            <input
              type="email"
              name="email"
              placeholder="Email"
              className="outline-none w-full"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex items-center bg-white border rounded px-3 py-2 shadow-sm">
            <FaLock className="text-gray-400 mr-2" />
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="outline-none w-full"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded bg-gradient-to-r from-black via-gray-800 to-black text-white font-semibold shadow-md hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Login
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}

export default Register;