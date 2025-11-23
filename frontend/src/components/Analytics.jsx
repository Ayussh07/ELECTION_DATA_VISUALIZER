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
  
  // Question A: Highest voter turnout state
  const [highestTurnout, setHighestTurnout] = useState(null);
  
  // Question B: Seat changes between consecutive elections
  const [seatChanges, setSeatChanges] = useState([]);
  
  // Question C: Women candidates percentage
  const [womenCandidates, setWomenCandidates] = useState(null);
  
  // Question D: Narrowest victory margins
  const [closestContests, setClosestContests] = useState([]);
  
  // Question E: National vs Regional vote share over time
  const [nationalVsRegional, setNationalVsRegional] = useState([]);
  
  // Question F: Education correlation
  const [educationCorrelation, setEducationCorrelation] = useState([]);

  useEffect(() => {
    const selectedYearParam = searchParams.get('year');
    const selectedYear = selectedYearParam ? parseInt(selectedYearParam) : null;
    
    // Only proceed if we have a valid year in range
    if (!selectedYear || selectedYear < 1991 || selectedYear > 2019) {
      return; // Don't load if no valid year selected
    }
    
    setLoading(true);
    
    // Get available years first to find previous year
    getYears()
      .then((response) => {
        // Filter years to 1991-2019 only
        const filteredYears = response.data
          .filter(year => year >= 1991 && year <= 2019)
          .sort((a, b) => b - a);
        setYears(filteredYears);
        
        // Find previous year in filtered list
        const selectedYearIndex = filteredYears.indexOf(selectedYear);
        const previousYear = selectedYearIndex >= 0 && selectedYearIndex < filteredYears.length - 1
          ? filteredYears[selectedYearIndex + 1]
          : null;
        
        // Load all analytics data
        Promise.all([
          // Question A: Highest turnout in selected election
          getHighestTurnout(selectedYear).then(res => res.data).catch(() => null),
          
          // Question B: Seat changes between two consecutive elections
          previousYear ? getSeatChanges(previousYear, selectedYear).then(res => res.data).catch(() => []) : Promise.resolve([]),
          
          // Question C: Women candidates percentage (all elections 1991-2019)
          getWomenCandidates(null, null).then(res => {
            const data = res.data || [];
            // Data is already filtered to 1991-2019 in backend
            if (data.length > 0) {
              const totalWomen = data.reduce((sum, row) => sum + (parseInt(row.women_count) || 0), 0);
              const totalCandidates = data.reduce((sum, row) => sum + (parseInt(row.total_count) || 0), 0);
              return totalCandidates > 0 ? (totalWomen * 100.0 / totalCandidates) : 0;
            }
            return 0;
          }).catch(() => 0),
          
          // Question D: Narrowest victory margins (selected election)
          getClosestContests(selectedYear).then(res => res.data || []).catch(() => []),
          
          // Question E: National vs Regional vote share over time (filtered to 1991-2019)
          getNationalVsRegionalVoteShare().then(res => {
            const data = res.data || [];
            return data.filter(item => item.year >= 1991 && item.year <= 2019);
          }).catch(() => []),
          
          // Question F: Education correlation (filtered to 1991-2019)
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
        <h2 className="text-2xl font-bold mb-6">Analytical Scenarios</h2>
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

  // Prepare data for question E chart (filtered to 1991-2019)
  const voteShareChartData = {};
  nationalVsRegional
    .filter(item => item.year >= 1991 && item.year <= 2019)
    .forEach(item => {
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

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Analytical Scenarios</h2>
      
      {/* Question A */}
      <div className="border-l-4 border-blue-500 pl-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          a. Which state had the highest voter turnout in the {searchParams.get('year') || years[0] || 'latest'} general election?
        </h3>
        {highestTurnout ? (
          <div className="text-lg text-gray-700">
            <span className="font-bold text-blue-600">{highestTurnout.state}</span> had the highest voter turnout of{' '}
            <span className="font-bold">{parseFloat(highestTurnout.avg_turnout || 0).toFixed(2)}%</span>
          </div>
        ) : (
          <div className="text-gray-500">Data not available</div>
        )}
      </div>

      {/* Question B */}
      <div className="border-l-4 border-green-500 pl-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          b. Which party gained or lost the most seats between two consecutive elections?
        </h3>
        {maxGain && maxLoss ? (
          <div className="space-y-2 text-gray-700">
            <div>
              <span className="font-bold text-green-600">{maxGain.party}</span> gained the most seats:{' '}
              <span className="font-bold">+{maxGain.change}</span> seats
              {' '}({maxGain.year1_seats} → {maxGain.year2_seats})
            </div>
            <div>
              <span className="font-bold text-red-600">{maxLoss.party}</span> lost the most seats:{' '}
              <span className="font-bold">{maxLoss.change}</span> seats
              {' '}({maxLoss.year1_seats} → {maxLoss.year2_seats})
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Data not available</div>
        )}
      </div>

      {/* Question C */}
      <div className="border-l-4 border-purple-500 pl-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          c. What is the percentage of women candidates across all elections (1991-2019)?
        </h3>
        {womenCandidates !== null ? (
          <div className="text-lg text-gray-700">
            <span className="font-bold text-purple-600">{parseFloat(womenCandidates).toFixed(2)}%</span> of all candidates across all elections (1991-2019) were women.
          </div>
        ) : (
          <div className="text-gray-500">Data not available</div>
        )}
      </div>

      {/* Question D */}
      <div className="border-l-4 border-orange-500 pl-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          d. Which constituencies had the narrowest victory margins in {searchParams.get('year') || years[0] || 'the selected year'}?
        </h3>
        {closestContests.length > 0 ? (
          <div className="mt-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Constituency</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Winner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Runner-up</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Margin %</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {closestContests.slice(0, 10).map((contest, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{contest.constituency_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{contest.state_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {contest.winner} ({contest.winner_party})
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {contest.runner_up} ({contest.runner_up_party})
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
        ) : (
          <div className="text-gray-500">Data not available</div>
        )}
      </div>

      {/* Question E */}
      <div className="border-l-4 border-indigo-500 pl-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          e. How has the vote share of national vs regional parties changed over time?
        </h3>
        {voteShareChartArray.length > 0 ? (
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
        ) : (
          <div className="text-gray-500">Data not available</div>
        )}
      </div>

      {/* Question F */}
      <div className="border-l-4 border-pink-500 pl-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          f. What correlation exists between education level and the winning chances of candidates?
        </h3>
        {educationCorrelation.length > 0 ? (
          <div className="mt-4">
            <div className="mb-4">
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
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-semibold">Top 3 Education Levels by Win Rate:</p>
              {educationCorrelation.slice(0, 3).map((item, idx) => (
                <p key={idx}>
                  {idx + 1}. <span className="font-medium">{item.education}</span>: {parseFloat(item.win_rate).toFixed(2)}% 
                  ({item.winners} wins out of {item.total_candidates} candidates)
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Data not available</div>
        )}
      </div>
    </div>
  );
};

export default Analytics;

