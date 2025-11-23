import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getVoteShare } from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const VoteShareChart = () => {
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
    console.log('VoteShareChart: Fetching data for year:', year, 'state:', state, 'party:', party, 'gender:', gender);
    setLoading(true);
    getVoteShare(year, party, true, state, gender) // aggregate=true for pie chart
      .then((response) => {
        // Handle both array format and { rows: [...] } format
        const data = Array.isArray(response.data) ? response.data : (response.data.rows || []);
        console.log('VoteShareChart: Received data for year', year, ':', data.length, 'parties');
        // Get top 7 parties by vote share
        const topParties = data
          .filter(item => item.party && item.vote_share_pct !== null && item.vote_share_pct !== undefined)
          .slice(0, 7)
          .map(item => ({
            name: item.party,
            value: parseFloat(item.vote_share_pct) || 0
          }));
        console.log('VoteShareChart: Top parties:', topParties);
        setData(topParties);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching vote share:', error);
        setLoading(false);
      });
  }, [searchParams.get('year'), searchParams.get('state'), searchParams.get('party'), searchParams.get('gender')]); // Re-fetch when filters change

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Vote Share (Top Parties)</h2>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Vote Share (Top Parties)</h2>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VoteShareChart;



