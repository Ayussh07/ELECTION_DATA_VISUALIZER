import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  getHighestTurnout, 
  getSeatChanges, 
  getWomenCandidates, 
  getClosestContests,
  getNationalVsRegionalVoteShare,
  getEducationCorrelation,
  getYears
} from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const Analytics = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState([]);
  
  // Data states
  const [highestTurnout, setHighestTurnout] = useState(null);
  const [seatChanges, setSeatChanges] = useState([]);
  const [womenCandidates, setWomenCandidates] = useState(null);
  const [closestContests, setClosestContests] = useState([]);
  const [nationalVsRegional, setNationalVsRegional] = useState([]);
  const [educationCorrelation, setEducationCorrelation] = useState([]);

  useEffect(() => {
    const selectedYearParam = searchParams.get('year');
    const selectedYear = selectedYearParam ? parseInt(selectedYearParam) : null;
    
    // Only proceed if year is valid and within 1991-2019 range
    if (!selectedYear || isNaN(selectedYear) || selectedYear < 1991 || selectedYear > 2019) {
      return;
    }
    
    setLoading(true);
    
    getYears()
      .then((response) => {
        // Filter to only show years from 1991 to 2019
        const filteredYears = response.data
          .filter(year => year != null && !isNaN(year) && year >= 1991 && year <= 2019)
          .sort((a, b) => b - a);
        setYears(filteredYears);
        
        // Verify selected year exists in database and is within 1991-2019 range
        if (!filteredYears.includes(selectedYear) || selectedYear < 1991 || selectedYear > 2019) {
          setLoading(false);
          return;
        }
        
        const selectedYearIndex = filteredYears.indexOf(selectedYear);
        const previousYear = selectedYearIndex >= 0 && selectedYearIndex < filteredYears.length - 1
          ? filteredYears[selectedYearIndex + 1]
          : null;
        
        Promise.all([
          getHighestTurnout(selectedYear).then(res => res.data).catch(() => null),
          previousYear ? getSeatChanges(previousYear, selectedYear).then(res => res.data).catch(() => []) : Promise.resolve([]),
          getWomenCandidates(null, null).then(res => {
            const data = res.data || [];
            if (data.length > 0) {
              const totalWomen = data.reduce((sum, row) => sum + (parseInt(row.women_count) || 0), 0);
              const totalCandidates = data.reduce((sum, row) => sum + (parseInt(row.total_count) || 0), 0);
              return totalCandidates > 0 ? (totalWomen * 100.0 / totalCandidates) : 0;
            }
            return 0;
          }).catch(() => 0),
          getClosestContests(selectedYear).then(res => res.data || []).catch(() => []),
          getNationalVsRegionalVoteShare().then(res => {
            const data = res.data || [];
            return data;
          }).catch(() => []),
          getEducationCorrelation().then(res => res.data || []).catch(() => [])
        ]).then(([turnout, changes, womenPct, contests, voteShare, education]) => {
          setHighestTurnout(turnout);
          setSeatChanges(changes);
          setWomenCandidates(womenPct);
          setClosestContests(contests);
          setNationalVsRegional(voteShare);
          setEducationCorrelation(education);
          setLoading(false);
        });
      })
      .catch((error) => {
        console.error('Error loading analytics:', error);
        setLoading(false);
      });
  }, [searchParams.get('year')]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">Election Analytics</h2>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Prepare data for vote share chart
  const voteShareChartData = {};
  nationalVsRegional.forEach(item => {
    if (!voteShareChartData[item.year]) {
      voteShareChartData[item.year] = { year: item.year };
    }
    voteShareChartData[item.year][item.party_type] = parseFloat(item.vote_share_pct) || 0;
  });
  const voteShareChartArray = Object.values(voteShareChartData).sort((a, b) => a.year - b.year);

  // Find party with most seat change
  const maxGain = seatChanges.length > 0 
    ? seatChanges.reduce((max, party) => {
        const change = parseInt(party.change) || 0;
        const maxChange = parseInt(max.change) || 0;
        return change > maxChange ? party : max;
      }, seatChanges[0])
    : null;
  const maxLoss = seatChanges.length > 0
    ? seatChanges.reduce((min, party) => {
        const change = parseInt(party.change) || 0;
        const minChange = parseInt(min.change) || 0;
        return change < minChange ? party : min;
      }, seatChanges[0])
    : null;

  const selectedYear = searchParams.get('year') || years[0] || '';

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Election Analytics Dashboard</h2>
      
      {/* Highest Turnout */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-800">Highest Voter Turnout - {selectedYear}</h3>
          <span className="text-sm text-gray-600">State Performance</span>
        </div>
        {highestTurnout ? (
          <div className="mt-3">
            <div className="text-2xl font-bold text-blue-700">{highestTurnout.state}</div>
            <div className="text-lg text-gray-700 mt-1">
              Turnout: <span className="font-semibold">{parseFloat(highestTurnout.avg_turnout || 0).toFixed(2)}%</span>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 mt-3">Data not available</div>
        )}
      </div>

      {/* Seat Changes */}
      {maxGain && maxLoss && (
        <div className="bg-gradient-to-r from-green-50 to-red-50 rounded-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Seat Movement Analysis</h3>
            <span className="text-sm text-gray-600">Consecutive Elections Comparison</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded p-4 border border-green-200">
              <div className="text-sm text-gray-600 mb-1">Biggest Gain</div>
              <div className="text-xl font-bold text-green-700">{maxGain.party}</div>
              <div className="text-sm text-gray-700 mt-2">
                <span className="font-semibold">+{maxGain.change}</span> seats ({maxGain.year1_seats} → {maxGain.year2_seats})
              </div>
            </div>
            <div className="bg-white rounded p-4 border border-red-200">
              <div className="text-sm text-gray-600 mb-1">Biggest Loss</div>
              <div className="text-xl font-bold text-red-700">{maxLoss.party}</div>
              <div className="text-sm text-gray-700 mt-2">
                <span className="font-semibold">{maxLoss.change}</span> seats ({maxLoss.year1_seats} → {maxLoss.year2_seats})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Women Candidates */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border-l-4 border-purple-500">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-800">Gender Representation</h3>
          <span className="text-sm text-gray-600">All Elections</span>
        </div>
        {womenCandidates !== null ? (
          <div className="mt-3">
            <div className="text-3xl font-bold text-purple-700">{parseFloat(womenCandidates).toFixed(2)}%</div>
            <div className="text-sm text-gray-700 mt-1">of all candidates were women across all elections</div>
          </div>
        ) : (
          <div className="text-gray-500 mt-3">Data not available</div>
        )}
      </div>

      {/* Narrowest Margins */}
      {closestContests.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Closest Contests - {selectedYear}</h3>
            <span className="text-sm text-gray-600">Top 10 Narrowest Victories</span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Constituency</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Winner</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Runner-up</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {closestContests.slice(0, 10).map((contest, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{contest.constituency_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{contest.state_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {contest.winner} <span className="text-gray-500">({contest.winner_party})</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {contest.runner_up} <span className="text-gray-500">({contest.runner_up_party})</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-orange-600">
                      {parseFloat(contest.margin_percentage || 0).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* National vs Regional Vote Share */}
      {voteShareChartArray.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-6 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Party Type Vote Share Trend</h3>
            <span className="text-sm text-gray-600">National vs Regional Parties</span>
          </div>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={voteShareChartArray}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis label={{ value: 'Vote Share %', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="National" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="Regional" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="Other" stroke="#6b7280" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Education Correlation */}
      {educationCorrelation.length > 0 && (
        <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-6 border-l-4 border-pink-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Education & Electoral Success</h3>
            <span className="text-sm text-gray-600">Win Rate by Education Level</span>
          </div>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={educationCorrelation.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="education" angle={-45} textAnchor="end" height={100} />
                <YAxis label={{ value: 'Win Rate %', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="win_rate" fill="#ec4899" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {educationCorrelation.slice(0, 3).map((item, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 border border-pink-200">
                <div className="text-sm text-gray-600 mb-1">#{idx + 1} Highest Win Rate</div>
                <div className="text-lg font-bold text-pink-700">{item.education}</div>
                <div className="text-sm text-gray-700 mt-2">
                  <span className="font-semibold">{parseFloat(item.win_rate).toFixed(2)}%</span> win rate
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {item.winners} wins / {item.total_candidates} candidates
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
