import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getGenderTrend } from '../services/api';

const GenderTrendChart = () => {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const party = searchParams.get('party');
    const state = searchParams.get('state');
    const gender = searchParams.get('gender');
    const district = searchParams.get('district');
    const constituency = searchParams.get('constituency');
    console.log('GenderTrendChart: Fetching data for party:', party, 'state:', state, 'district:', district, 'constituency:', constituency, 'gender:', gender);
    setLoading(true);
    getGenderTrend(party, state, gender, district, constituency)
      .then((response) => {
        // Handle both array format and { rows: [...] } format
        const data = Array.isArray(response.data) ? response.data : (response.data.rows || []);
        console.log('GenderTrendChart: Received data:', data.length, 'rows');
        // Transform data for chart - map M/F to Male/Female
        const yearMap = {};
        data.forEach((item) => {
          if (!yearMap[item.year]) {
            yearMap[item.year] = { year: item.year, Male: 0, Female: 0 };
          }
          // Map M -> Male, F -> Female
          const genderKey = item.gender === 'M' ? 'Male' : (item.gender === 'F' ? 'Female' : item.gender);
          if (genderKey === 'Male' || genderKey === 'Female') {
            yearMap[item.year][genderKey] = parseFloat(item.percentage) || 0;
          }
        });
        // Filter to only show years from 1991 to 2019
        const chartData = Object.values(yearMap)
          .filter(item => item.year >= 1991 && item.year <= 2019)
          .sort((a, b) => a.year - b.year);
        console.log('GenderTrendChart: Transformed data:', chartData);
        setData(chartData);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching gender trend:', error);
        setLoading(false);
      });
  }, [searchParams.get('party'), searchParams.get('state'), searchParams.get('district'), searchParams.get('constituency'), searchParams.get('gender')]); // Re-fetch when filters change

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Gender Representation Trend</h2>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Gender Representation Trend</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="Male" stroke="#3b82f6" strokeWidth={2} />
          <Line type="monotone" dataKey="Female" stroke="#ec4899" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GenderTrendChart;



