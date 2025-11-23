import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getSeatShare } from '../services/api';

const SeatShareChart = () => {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const year = searchParams.get('year');
    const state = searchParams.get('state');
    const party = searchParams.get('party');
    const gender = searchParams.get('gender');
    if (!year) {
      // Wait for year to be set by Header component
      return;
    }
    console.log('SeatShareChart: Fetching data for year:', year, 'state:', state, 'party:', party, 'gender:', gender);
    setLoading(true);
    getSeatShare(year, state, party, gender)
      .then((response) => {
        // Handle both array format and { rows: [...] } format
        const data = Array.isArray(response.data) ? response.data : (response.data.rows || []);
        console.log('SeatShareChart: Received data for year', year, 'state', state, 'party', party, 'gender', gender, ':', data.length, 'parties');
        setData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching seat share:', error);
        setLoading(false);
      });
  }, [searchParams.get('year'), searchParams.get('state'), searchParams.get('party'), searchParams.get('gender')]); // Re-fetch when filters change

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Seat Share by Party</h2>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Seat Share by Party</h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="party" angle={-45} textAnchor="end" height={100} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="seats" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SeatShareChart;



