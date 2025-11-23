# API Contract Documentation

## Base URL
```
http://localhost:5000/api
```

## Basic Endpoints

### Get Available Years
**GET** `/years`  
Returns years with >= 1000 records (1991-2019).  
**Response:** `[2019, 2014, 2009, 2004, ...]`

### Get All States
**GET** `/states`  
**Response:** `[{"id": 1, "name": "Andhra Pradesh"}, ...]`

### Get All Parties
**GET** `/parties`  
**Response:** `[{"id": 1, "name": "BJP", "party_type_tcpd": "National Party"}, ...]`

### Get Constituencies (Districts)
**GET** `/constituencies?state={id}`  
Returns unique constituency names grouped by name.  
**Response:** `[{"id": 1, "name": "Araku"}, ...]`

### Get Constituencies List
**GET** `/constituencies-list?state={id}&district={id}`  
Returns individual constituencies (not grouped).  
**Response:** `[{"id": 1, "name": "Araku", "constituency_no": 1, "constituency_type": "ST"}, ...]`

### Get Election Results
**GET** `/elections?year={year}&state={id}&party={id}&constituency={name}&limit={n}&offset={n}`  
**Response:** Array of election result objects with candidate, party, votes, turnout, margin data.

---

## Analytics Endpoints

### Get Seat Share
**GET** `/seat-share?year={year}&state={id}&party={id}&gender={M|F}&district={id}&constituency={id}`  
Returns seat share by party with winners grouped by district.  
**Response:**
```json
[{
  "party": "BJP",
  "seats": 303,
  "winnersByDistrict": [{
    "district": "Araku",
    "winners": ["Candidate 1", "Candidate 2"]
  }]
}]
```

### Get Turnout
**GET** `/turnout?year={year}&state={id}`  
Returns average turnout by state.  
**Response:** `[{"state": "Lakshadweep", "turnout_pct": 85.23}, ...]`

### Get Vote Share
**GET** `/vote-share?year={year}&aggregate={true|false}&state={id}&party={id}&gender={M|F}&district={id}&constituency={id}`  
- `aggregate=true`: Returns aggregated vote share by party (for charts)  
- `aggregate=false` or omitted: Returns vote share by state and party  
**Response (aggregated):** `[{"party": "BJP", "total_votes": 229076879, "vote_share_pct": 37.36}, ...]`  
**Response (by state):** `[{"state": "UP", "party": "BJP", "total_votes": 12345678, "avg_vote_share": 49.56}, ...]`

### Get Gender Trend
**GET** `/gender-trend?party={id}&state={id}&gender={M|F}&district={id}&constituency={id}`  
Returns gender representation trends over years.  
**Response:** `[{"year": 2019, "gender": "M", "count": 8500, "percentage": 92.5}, ...]`

### Get Narrowest Victories
**GET** `/margins?year={year}&state={id}&limit={n}&district={id}&constituency={id}`  
Returns constituencies with narrowest victory margins.  
**Response:** `[{"year": 2019, "state_name": "Karnataka", "constituency_name": "Chikkaballapur", "winner": "M. Veerappa Moily", "winner_party": "INC", "margin_percentage": 0.005}, ...]`

### Get Key Performance Indicators
**GET** `/kpis?year={year}&state={id}&gender={M|F}&district={id}&constituency={id}`  
**Response:** `{"total_seats": 543, "overall_turnout": 67.4, "women_candidates_pct": 9.2}`

### Search
**GET** `/search?q={query}&type={candidate|party|constituency}`  
**Response:** `{"candidates": [...], "constituencies": [...], "parties": [...]}`

---

## Advanced Analytics

### Highest Turnout State
**GET** `/analytics/highest-turnout?year={year}`  
**Response:** `{"state": "Lakshadweep", "avg_turnout": 85.23}`

### Seat Changes
**GET** `/analytics/seat-changes?year1={year}&year2={year}`  
Returns party seat gains/losses between two elections.  
**Response:** `[{"party": "BJP", "year1_seats": 282, "year2_seats": 303, "change": 21}, ...]`

### Women Candidates
**GET** `/analytics/women-candidates?year={year}`  
Year parameter is optional. Returns percentage across all elections if omitted.  
**Response:** `{"total_women": 4500, "total_candidates": 85000, "percentage": 5.29}`

### Closest Contests
**GET** `/analytics/closest-contests?year={year}&limit={n}`  
**Response:** Array of closest election contests with winner/runner-up details.

### Turnout-Margin Correlation
**GET** `/analytics/correlation?state={id}`  
Returns correlation between turnout and margin percentage by state.  
**Response:** `[{"state": "Kerala", "avg_turnout": 77.45, "avg_margin": 12.34, "correlation": -0.23}, ...]`

### National vs Regional Vote Share
**GET** `/analytics/national-vs-regional`  
Returns vote share trends over time by party type.  
**Response:** `[{"year": 1991, "party_type": "National", "total_votes": 150000000, "vote_share_pct": 65.5}, ...]`

### Education Correlation
**GET** `/analytics/education-correlation`  
Returns win rates by education level, sorted by win rate.  
**Response:** `[{"education": "Doctorate", "total_candidates": 858, "wins": 144, "win_rate": 16.78}, ...]`

---

## Filter Parameters

Most endpoints support optional filters:
- `year`: Election year (required for some endpoints, range: 1991-2019)
- `state`: State ID
- `party`: Party ID
- `gender`: M or F
- `district`: District ID (filters by district name to include all constituencies with that name)
- `constituency`: Constituency ID (filters specific constituency)

**Filter Hierarchy:** State → District → Constituency

---

## Error Responses

**400 Bad Request:**
```json
{"error": "Year parameter is required"}
```

**404 Not Found:**
```json
{"error": "Route not found"}
```

**500 Internal Server Error:**
```json
{"error": "Failed to fetch data", "details": "Error message"}
```

---

## Notes

- All year filters are limited to 1991-2019
- Only years with >= 1000 records are returned by `/years`
- District filter includes all constituencies with the same name
- Constituency filter targets a specific constituency ID
- Default pagination: `limit=100`, `offset=0`
- CORS enabled for all origins (configure for production)
