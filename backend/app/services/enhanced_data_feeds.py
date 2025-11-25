"""
PRIMARY SERVICE
Enhanced Data Feeds with real injury data and weather correlation analysis.
"""
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import os
import logging
import random
import json
from dotenv import load_dotenv
import google.generativeai as genai
from app.config import get_settings

load_dotenv()

logger = logging.getLogger(__name__)

class EnhancedDataFeeds:
    """
    Enhanced data feeds with:
    - Real injury data (ESPN API)
    - Weather correlation analysis
    - Better team location mapping
    - Google Gemini Intelligence
    """
    
    def __init__(self):
        self.settings = get_settings()
        # Comprehensive team locations (NBA + NFL)
        self.team_locations = self._load_team_locations()
        self.espn_base = "https://site.api.espn.com/apis/site/v2/sports"
        # ESPN team ID mappings (abbreviation -> ESPN team ID)
        self.team_id_map = self._load_team_id_map()
        # Team name to abbreviation mapping
        self.team_name_to_abbr = self._load_team_name_mapping()
        # Alternative abbreviation mappings (ESPN alternative -> correct abbreviation)
        self.alternative_abbr_map = self._load_alternative_abbr_map()
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        self._init_gemini_client()

    def _init_gemini_client(self):
        """Initialize Google Gemini API client"""
        try:
            api_key = self.settings.GEMINI_API_KEY
            if api_key:
                genai.configure(api_key=api_key)
                # Use gemini-2.5-flash (fast, available on free tier)
                # Alternative: gemini-2.5-pro for advanced reasoning, gemini-3-pro-preview (may require paid tier)
                self.gemini_model = genai.GenerativeModel('gemini-2.5-flash')
                logger.info("Gemini API client initialized successfully with gemini-2.5-flash")
            else:
                self.gemini_model = None
                logger.warning("GEMINI_API_KEY not found. Intelligence features will be limited.")
        except Exception as e:
            self.gemini_model = None
            logger.error(f"Failed to initialize Gemini client: {e}")
    
    def _load_alternative_abbr_map(self) -> Dict[str, Dict[str, str]]:
        """Map ESPN's alternative abbreviations to correct team_id_map keys"""
        return {
            "nba": {
                "NY": "NYK",      # New York Knicks
                "GS": "GSW",      # Golden State Warriors
                "UTAH": "UTA"     # Utah Jazz
            },
            "nfl": {
                # Add NFL alternative mappings if needed in the future
            }
        }
    
    def _load_team_name_mapping(self) -> Dict[str, Dict[str, str]]:
        """Map full team names to abbreviations"""
        return {
            "nba": {
                "Atlanta Hawks": "ATL",
                "Boston Celtics": "BOS",
                "Brooklyn Nets": "BKN",
                "Charlotte Hornets": "CHA",
                "Chicago Bulls": "CHI",
                "Cleveland Cavaliers": "CLE",
                "Dallas Mavericks": "DAL",
                "Denver Nuggets": "DEN",
                "Detroit Pistons": "DET",
                "Golden State Warriors": "GSW",
                "Houston Rockets": "HOU",
                "Indiana Pacers": "IND",
                "LA Clippers": "LAC",
                "Los Angeles Clippers": "LAC",
                "Los Angeles Lakers": "LAL",
                "Memphis Grizzlies": "MEM",
                "Miami Heat": "MIA",
                "Milwaukee Bucks": "MIL",
                "Minnesota Timberwolves": "MIN",
                "New Orleans Pelicans": "NO",
                "New York Knicks": "NYK",
                "Oklahoma City Thunder": "OKC",
                "Orlando Magic": "ORL",
                "Philadelphia 76ers": "PHI",
                "Phoenix Suns": "PHX",
                "Portland Trail Blazers": "POR",
                "Sacramento Kings": "SAC",
                "San Antonio Spurs": "SA",
                "Toronto Raptors": "TOR",
                "Utah Jazz": "UTA",
                "Washington Wizards": "WAS"
            },
            "nfl": {
                "Arizona Cardinals": "ARI",
                "Atlanta Falcons": "ATL",
                "Baltimore Ravens": "BAL",
                "Buffalo Bills": "BUF",
                "Carolina Panthers": "CAR",
                "Chicago Bears": "CHI",
                "Cincinnati Bengals": "CIN",
                "Cleveland Browns": "CLE",
                "Dallas Cowboys": "DAL",
                "Denver Broncos": "DEN",
                "Detroit Lions": "DET",
                "Green Bay Packers": "GB",
                "Houston Texans": "HOU",
                "Indianapolis Colts": "IND",
                "Jacksonville Jaguars": "JAX",
                "Kansas City Chiefs": "KC",
                "Las Vegas Raiders": "LV",
                "Los Angeles Chargers": "LAC",
                "Los Angeles Rams": "LAR",
                "Miami Dolphins": "MIA",
                "Minnesota Vikings": "MIN",
                "New England Patriots": "NE",
                "New Orleans Saints": "NO",
                "New York Giants": "NYG",
                "New York Jets": "NYJ",
                "Philadelphia Eagles": "PHI",
                "Pittsburgh Steelers": "PIT",
                "San Francisco 49ers": "SF",
                "Seattle Seahawks": "SEA",
                "Tampa Bay Buccaneers": "TB",
                "Tennessee Titans": "TEN",
                "Washington Commanders": "WAS"
            }
        }
    
    def _normalize_team_name(self, team_name: str, league: str) -> str:
        """Convert team name to abbreviation"""
        # First try exact match
        name_map = self.team_name_to_abbr.get(league, {})
        if team_name in name_map:
            return name_map[team_name]
        
        # Try case-insensitive match
        team_name_lower = team_name.lower()
        for full_name, abbr in name_map.items():
            if full_name.lower() == team_name_lower:
                return abbr
        
        # If already an abbreviation (2-4 uppercase letters), check if it's valid
        if len(team_name) <= 4 and team_name.isupper():
            # First check if it exists in team_id_map
            if team_name in self.team_id_map.get(league, {}):
                return team_name
            
            # If not found, check alternative abbreviation map
            alt_map = self.alternative_abbr_map.get(league, {})
            if team_name in alt_map:
                return alt_map[team_name]
            
            # If still not found, return as-is (will cause warning but won't break)
            return team_name
        
        # Try to extract abbreviation from name (last word or common patterns)
        words = team_name.split()
        if words:
            # Try last word
            last_word = words[-1].upper()
            if last_word in self.team_id_map.get(league, {}):
                return last_word
            # Also check alternative map for last word
            alt_map = self.alternative_abbr_map.get(league, {})
            if last_word in alt_map:
                return alt_map[last_word]
        
        # Return original if no match found
        return team_name
        
    def _load_team_id_map(self) -> Dict[str, Dict[str, str]]:
        """Load ESPN team ID mappings for NFL and NBA"""
        return {
            "nfl": {
                "KC": "12", "BUF": "2", "MIA": "15", "PHI": "21", "DAL": "6",
                "NE": "17", "GB": "9", "CHI": "3", "NYG": "19", "NYJ": "20",
                "LAR": "14", "LAC": "24", "SF": "25", "SEA": "26", "DEN": "7",
                "BAL": "1", "PIT": "23", "CLE": "5", "CIN": "4", "TEN": "10",
                "IND": "11", "JAX": "30", "HOU": "34", "ATL": "1", "CAR": "29",
                "NO": "18", "TB": "27", "ARI": "22", "LV": "13", "MIN": "16",
                "DET": "8", "WAS": "28", "WSH": "28"  # Washington Commanders (both abbreviations)
            },
            "nba": {
                "ATL": "1", "BOS": "2", "BKN": "17", "CHA": "30", "CHI": "4",
                "CLE": "5", "DAL": "6", "DEN": "7", "DET": "8", "GSW": "9",
                "HOU": "10", "IND": "11", "LAC": "12", "LAL": "13", "MEM": "29",
                "MIA": "14", "MIL": "15", "MIN": "16", "NO": "3", "NYK": "18",
                "OKC": "25", "ORL": "19", "PHI": "20", "PHX": "21", "POR": "22",
                "SAC": "23", "SA": "24", "TOR": "28", "UTA": "26", "WAS": "27"
            }
        }
        
    def _load_team_locations(self) -> Dict[str, Dict]:
        """Load comprehensive team location data"""
        return {
            # NFL
            "KC": {"lat": 39.0997, "lon": -94.5786, "city": "Kansas City", "state": "MO"},
            "BUF": {"lat": 42.8864, "lon": -78.8784, "city": "Buffalo", "state": "NY"},
            "MIA": {"lat": 25.7617, "lon": -80.1918, "city": "Miami", "state": "FL"},
            "PHI": {"lat": 39.9526, "lon": -75.1652, "city": "Philadelphia", "state": "PA"},
            "DAL": {"lat": 32.7767, "lon": -96.7970, "city": "Dallas", "state": "TX"},
            "NE": {"lat": 42.3662, "lon": -71.0621, "city": "Foxborough", "state": "MA"},
            "GB": {"lat": 44.5013, "lon": -88.0622, "city": "Green Bay", "state": "WI"},
            "CHI": {"lat": 41.8625, "lon": -87.6167, "city": "Chicago", "state": "IL"},
            "NYG": {"lat": 40.8136, "lon": -74.0744, "city": "East Rutherford", "state": "NJ"},
            "NYJ": {"lat": 40.8136, "lon": -74.0744, "city": "East Rutherford", "state": "NJ"},
            "LAR": {"lat": 34.0522, "lon": -118.2437, "city": "Los Angeles", "state": "CA"},
            "LAC": {"lat": 33.9533, "lon": -118.3389, "city": "Inglewood", "state": "CA"},
            "SF": {"lat": 37.4033, "lon": -121.9694, "city": "Santa Clara", "state": "CA"},
            "SEA": {"lat": 47.5952, "lon": -122.3316, "city": "Seattle", "state": "WA"},
            "DEN": {"lat": 39.7392, "lon": -104.9903, "city": "Denver", "state": "CO"},
            "BAL": {"lat": 39.2780, "lon": -76.6227, "city": "Baltimore", "state": "MD"},
            "PIT": {"lat": 40.4468, "lon": -80.0158, "city": "Pittsburgh", "state": "PA"},
            "CLE": {"lat": 41.5045, "lon": -81.6904, "city": "Cleveland", "state": "OH"},
            "CIN": {"lat": 39.0951, "lon": -84.5160, "city": "Cincinnati", "state": "OH"},
            "TEN": {"lat": 36.1665, "lon": -86.7713, "city": "Nashville", "state": "TN"},
            "IND": {"lat": 39.7601, "lon": -86.1639, "city": "Indianapolis", "state": "IN"},
            "JAX": {"lat": 30.3239, "lon": -81.6373, "city": "Jacksonville", "state": "FL"},
            "HOU": {"lat": 29.7604, "lon": -95.3698, "city": "Houston", "state": "TX"},
            "ATL": {"lat": 33.7490, "lon": -84.3880, "city": "Atlanta", "state": "GA"},
            "CAR": {"lat": 35.2271, "lon": -80.8431, "city": "Charlotte", "state": "NC"},
            "NO": {"lat": 29.9511, "lon": -90.0815, "city": "New Orleans", "state": "LA"},
            "TB": {"lat": 27.9506, "lon": -82.4572, "city": "Tampa", "state": "FL"},
            "ARI": {"lat": 33.5275, "lon": -112.2625, "city": "Glendale", "state": "AZ"},
            "LV": {"lat": 36.1673, "lon": -115.1485, "city": "Las Vegas", "state": "NV"},
            "LAC": {"lat": 33.9533, "lon": -118.3389, "city": "Inglewood", "state": "CA"},
            "MIN": {"lat": 44.9778, "lon": -93.2650, "city": "Minneapolis", "state": "MN"},
            "DET": {"lat": 42.3314, "lon": -83.0458, "city": "Detroit", "state": "MI"},
            "WAS": {"lat": 38.9072, "lon": -76.8644, "city": "Landover", "state": "MD"},
            "WSH": {"lat": 38.9072, "lon": -76.8644, "city": "Landover", "state": "MD"},  # Washington Commanders alias
            
            # NBA
            "BOS": {"lat": 42.3662, "lon": -71.0621, "city": "Boston", "state": "MA"},
            "BKN": {"lat": 40.6826, "lon": -73.9748, "city": "Brooklyn", "state": "NY"},
            "NYK": {"lat": 40.7505, "lon": -73.9934, "city": "New York", "state": "NY"},
            "PHI": {"lat": 39.9526, "lon": -75.1652, "city": "Philadelphia", "state": "PA"},
            "TOR": {"lat": 43.6532, "lon": -79.3832, "city": "Toronto", "state": "ON"},
            "CHI": {"lat": 41.8625, "lon": -87.6167, "city": "Chicago", "state": "IL"},
            "CLE": {"lat": 41.5045, "lon": -81.6904, "city": "Cleveland", "state": "OH"},
            "DET": {"lat": 42.3314, "lon": -83.0458, "city": "Detroit", "state": "MI"},
            "IND": {"lat": 39.7601, "lon": -86.1639, "city": "Indianapolis", "state": "IN"},
            "MIL": {"lat": 43.0389, "lon": -87.9065, "city": "Milwaukee", "state": "WI"},
            "ATL": {"lat": 33.7490, "lon": -84.3880, "city": "Atlanta", "state": "GA"},
            "CHA": {"lat": 35.2271, "lon": -80.8431, "city": "Charlotte", "state": "NC"},
            "MIA": {"lat": 25.7617, "lon": -80.1918, "city": "Miami", "state": "FL"},
            "ORL": {"lat": 28.5383, "lon": -81.3792, "city": "Orlando", "state": "FL"},
            "WAS": {"lat": 38.9072, "lon": -76.8644, "city": "Washington", "state": "DC"},
            "DEN": {"lat": 39.7392, "lon": -104.9903, "city": "Denver", "state": "CO"},
            "MIN": {"lat": 44.9778, "lon": -93.2650, "city": "Minneapolis", "state": "MN"},
            "OKC": {"lat": 35.4634, "lon": -97.5151, "city": "Oklahoma City", "state": "OK"},
            "POR": {"lat": 45.5152, "lon": -122.6784, "city": "Portland", "state": "OR"},
            "UTA": {"lat": 40.7608, "lon": -111.8910, "city": "Salt Lake City", "state": "UT"},
            "GSW": {"lat": 37.7680, "lon": -122.3879, "city": "San Francisco", "state": "CA"},
            "LAC": {"lat": 34.0522, "lon": -118.2437, "city": "Los Angeles", "state": "CA"},
            "LAL": {"lat": 34.0522, "lon": -118.2437, "city": "Los Angeles", "state": "CA"},
            "PHX": {"lat": 33.4484, "lon": -112.0740, "city": "Phoenix", "state": "AZ"},
            "SAC": {"lat": 38.5816, "lon": -121.4944, "city": "Sacramento", "state": "CA"},
            "DAL": {"lat": 32.7767, "lon": -96.7970, "city": "Dallas", "state": "TX"},
            "HOU": {"lat": 29.7604, "lon": -95.3698, "city": "Houston", "state": "TX"},
            "MEM": {"lat": 35.1495, "lon": -90.0490, "city": "Memphis", "state": "TN"},
            "NO": {"lat": 29.9511, "lon": -90.0815, "city": "New Orleans", "state": "LA"},
            "SA": {"lat": 29.4241, "lon": -98.4936, "city": "San Antonio", "state": "TX"},
        }
    
    def get_team_injuries(self, team_abbr: str, league: str = "nfl") -> List[Dict]:
        """
        Fetch real injury data from ESPN API.
        Returns empty list if API fails.
        
        Note: ESPN API provides current injury data, not historical. For games from
        the current season, this is typically accurate. For historical games from
        past seasons, injury data may not reflect the actual injuries at that time.
        """
        try:
            # Normalize team name to abbreviation
            normalized_abbr = self._normalize_team_name(team_abbr, league)
            
            # Get team ID from mapping
            team_id = self.team_id_map.get(league, {}).get(normalized_abbr.upper())
            if not team_id:
                logger.warning(f"No team ID mapping found for {team_abbr} (normalized: {normalized_abbr}) in {league}")
                return []
            
            # ESPN API endpoint for team roster/injuries
            if league == "nfl":
                url = f"{self.espn_base}/football/nfl/teams/{team_id}/roster"
            else:  # nba
                url = f"{self.espn_base}/basketball/nba/teams/{team_id}/roster"
            
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Ensure data is a dictionary
            if not isinstance(data, dict):
                logger.warning(f"Expected dict from ESPN API, got {type(data)}")
                return []
            
            # Parse injuries from roster data
            injuries = []
            athletes = []
            
            # ESPN API might nest data in 'team' or 'sports' keys
            try:
                if 'team' in data:
                    team_data = data['team']
                    if isinstance(team_data, dict):
                        athletes = team_data.get('athletes', [])
                    elif isinstance(team_data, str):
                        logger.warning(f"Team data is a string, not a dict for {team_abbr}")
                        return []
                elif 'sports' in data and isinstance(data['sports'], list) and len(data['sports']) > 0:
                    # Sometimes nested in sports[0].leagues[0].teams[0]
                    sports = data['sports']
                    if isinstance(sports[0], dict):
                        if 'leagues' in sports[0]:
                            leagues = sports[0]['leagues']
                            if isinstance(leagues, list) and len(leagues) > 0:
                                if isinstance(leagues[0], dict):
                                    teams = leagues[0].get('teams', [])
                                    if isinstance(teams, list) and len(teams) > 0:
                                        if isinstance(teams[0], dict):
                                            athletes = teams[0].get('athletes', [])
                else:
                    athletes = data.get('athletes', [])
            except (AttributeError, TypeError, KeyError) as e:
                logger.warning(f"Error parsing athletes data structure for {team_abbr}: {e}")
                return []
            
            # Ensure athletes is a list
            if not isinstance(athletes, list):
                logger.warning(f"Expected list for athletes, got {type(athletes)} for {team_abbr}")
                return []
            
            for athlete in athletes:
                try:
                    # Ensure athlete is a dictionary
                    if not isinstance(athlete, dict):
                        continue
                    
                    # Check for injury status - handle both 'injuries' and 'injury' keys
                    injury_status = athlete.get('injuries', [])
                    if not injury_status:
                        injury_status = athlete.get('injury', [])
                    
                    # Ensure injury_status is a list
                    if not isinstance(injury_status, list):
                        if isinstance(injury_status, dict):
                            # Sometimes injury is a single dict, wrap it in a list
                            injury_status = [injury_status]
                        else:
                            continue
                    
                    for injury in injury_status:
                        try:
                            # Ensure injury is a dictionary
                            if not isinstance(injury, dict):
                                continue
                            
                            # Handle status - can be dict or string
                            status_obj = injury.get('status', {})
                            if isinstance(status_obj, dict):
                                status = status_obj.get('name', 'Unknown')
                            elif isinstance(status_obj, str):
                                status = status_obj
                            else:
                                status = 'Unknown'
                            
                            # Only include significant statuses
                            if status.upper() in ['OUT', 'QUESTIONABLE', 'DOUBTFUL', 'PROBABLE']:
                                # Handle position - can be dict or string
                                position_obj = athlete.get('position', {})
                                if isinstance(position_obj, dict):
                                    position = position_obj.get('abbreviation', 'N/A')
                                elif isinstance(position_obj, str):
                                    position = position_obj
                                else:
                                    position = 'N/A'
                                
                                # Safely extract all fields
                                player_name = athlete.get('displayName', 'Unknown')
                                if not isinstance(player_name, str):
                                    player_name = str(player_name) if player_name else 'Unknown'
                                
                                injury_type = injury.get('type', 'Unknown')
                                if not isinstance(injury_type, str):
                                    injury_type = str(injury_type) if injury_type else 'Unknown'
                                
                                body_part = injury.get('bodyPart', '')
                                if not isinstance(body_part, str):
                                    body_part = str(body_part) if body_part else ''
                                
                                updated_at = injury.get('date', datetime.now().isoformat())
                                if not isinstance(updated_at, str):
                                    updated_at = datetime.now().isoformat()
                                
                                details = injury.get('detail', '')
                                if not isinstance(details, str):
                                    details = str(details) if details else ''
                                
                                injuries.append({
                                    "player_name": player_name,
                                    "position": position,
                                    "status": status,
                                    "injury_type": injury_type,
                                    "body_part": body_part,
                                    "updated_at": updated_at,
                                    "details": details
                                })
                        except (AttributeError, TypeError, KeyError) as e:
                            logger.debug(f"Error processing injury for {team_abbr}: {e}")
                            continue
                except (AttributeError, TypeError, KeyError) as e:
                    logger.debug(f"Error processing athlete for {team_abbr}: {e}")
                    continue
            
            # If we got real data, return it
            if injuries:
                return injuries
            
            # Try alternative: fetch from injury report endpoint
            return self._fetch_injury_report(team_id, league, team_abbr)
            
        except Exception as e:
            logger.error(f"Error fetching injuries for {team_abbr}: {e}")
            return []
    
    def _fetch_injury_report(self, team_id: str, league: str, team_abbr: str) -> List[Dict]:
        """Alternative method: fetch from injury report endpoint"""
        try:
            # ESPN injury report endpoint (may vary by league)
            if league == "nfl":
                # NFL injury reports are typically in scoreboard or team injury endpoints
                url = f"{self.espn_base}/football/nfl/teams/{team_id}"
            else:
                url = f"{self.espn_base}/basketball/nba/teams/{team_id}"
            
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Try to extract injuries from team data
            # This structure may vary, so we'll parse what we can find
            # Return empty if parsing fails
            return []
            
        except Exception as e:
            logger.error(f"Error fetching injury report: {e}")
            return []
    
    def calculate_injury_impact(self, injuries: List[Dict], league: str = "nfl") -> Dict:
        """
        Calculate comprehensive injury impact score and analysis.
        Returns impact score, key players out, and position breakdown.
        """
        if not injuries:
            return {
                "total_impact": 0.0,
                "key_players_out": [],
                "position_breakdown": {},
                "severity": "NONE",
                "summary": "No significant injuries"
            }
        
        # Position weights by league
        if league == "nfl":
            position_weights = {
                'QB': 4.0, 'OL': 2.5, 'RB': 1.8, 'WR': 1.8, 'TE': 1.2,
                'DL': 1.5, 'LB': 1.3, 'CB': 1.5, 'S': 1.2, 'K': 0.5, 'P': 0.3
            }
            critical_positions = ['QB', 'OL']
        else:  # NBA
            position_weights = {
                'PG': 2.5, 'SG': 1.8, 'SF': 2.0, 'PF': 1.8, 'C': 2.2
            }
            critical_positions = ['PG', 'C']
        
        # Status weights
        status_weights = {
            'OUT': 1.0,
            'DOUBTFUL': 0.7,
            'QUESTIONABLE': 0.4,
            'PROBABLE': 0.1
        }
        
        total_impact = 0.0
        key_players_out = []
        position_breakdown = {}
        
        for injury in injuries:
            position = injury.get('position', '')
            status = injury.get('status', '').upper()
            player_name = injury.get('player_name', 'Unknown')
            
            # Calculate impact for this injury
            pos_weight = position_weights.get(position, 1.0)
            status_weight = status_weights.get(status, 0.5)
            impact = pos_weight * status_weight
            
            total_impact += impact
            
            # Track position breakdown
            if position not in position_breakdown:
                position_breakdown[position] = {'count': 0, 'impact': 0.0, 'players': []}
            position_breakdown[position]['count'] += 1
            position_breakdown[position]['impact'] += impact
            position_breakdown[position]['players'].append({
                'name': player_name,
                'status': status,
                'injury_type': injury.get('injury_type', 'Unknown')
            })
            
            # Track key players (Out status on critical positions)
            if status == 'OUT' and position in critical_positions:
                key_players_out.append({
                    'name': player_name,
                    'position': position,
                    'injury_type': injury.get('injury_type', 'Unknown')
                })
        
        # Determine severity
        if total_impact >= 5.0:
            severity = "CRITICAL"
            summary = f"Critical injuries detected. {len(key_players_out)} key player(s) out."
        elif total_impact >= 3.0:
            severity = "HIGH"
            summary = f"Significant injury impact. Multiple players affected."
        elif total_impact >= 1.5:
            severity = "MODERATE"
            summary = f"Moderate injury concerns. Some players questionable."
        elif total_impact > 0:
            severity = "LOW"
            summary = f"Minor injury concerns. Most players probable."
        else:
            severity = "NONE"
            summary = "No significant injuries"
        
        return {
            "total_impact": round(total_impact, 2),
            "key_players_out": key_players_out,
            "position_breakdown": position_breakdown,
            "severity": severity,
            "summary": summary,
            "total_count": len(injuries)
        }

    def _fetch_weather(self, team_abbr: str, game_date: datetime, league: str) -> Dict:
        """
        Fetch/Simulate weather data.
        """
        # 1. Get location
        normalized_abbr = self._normalize_team_name(team_abbr, league)
        location = self.team_locations.get(normalized_abbr, {})
        
        if not location:
            return {
                "location": "Unknown",
                "temperature": 70,
                "condition": "Unknown",
                "wind_speed": "0 mph",
                "precipitation_chance": 0,
                "updated_at": datetime.now().isoformat()
            }
            
        # 2. Dome teams (always perfect weather)
        dome_teams = {
            'nfl': ['ARI', 'ATL', 'DAL', 'DET', 'HOU', 'IND', 'LAC', 'LAR', 'LV', 'MIN', 'NO'],
            'nba': list(self.team_id_map['nba'].keys()) # All NBA is indoors
        }
        
        is_dome = normalized_abbr in dome_teams.get(league, [])
        
        if is_dome:
            return {
                "location": f"{location.get('city', 'Unknown')}, {location.get('state', '')} (Indoors)",
                "temperature": 72,
                "condition": "Indoors",
                "wind_speed": "0 mph",
                "precipitation_chance": 0,
                "updated_at": datetime.now().isoformat(),
                "correlation_impact": {
                    "score": 0,
                    "severity": "LOW",
                    "factors": ["Indoor Stadium"],
                    "note": "Game played indoors. No weather impact."
                }
            }
            
        # 3. Simulate outdoor weather based on month and latitude
        month = game_date.month
        lat = location.get('lat', 40)
        
        # Base temp (rough approximation)
        base_temp = 90 - (lat - 25) * 1.5
        
        # Season adjustment
        if month in [12, 1, 2]: # Winter
            temp_adj = -30
        elif month in [3, 11]: # Shoulder
            temp_adj = -15
        elif month in [4, 10]:
            temp_adj = -5
        else: # Summer/Early Fall
            temp_adj = 0
            
        temp = int(base_temp + temp_adj)
        
        # Randomize slightly
        temp += random.randint(-5, 5)
        
        # Conditions
        conditions = ["Clear", "Partly Cloudy", "Cloudy", "Rain", "Snow"]
        weights = [40, 30, 20, 8, 2]
        
        if temp > 35: weights[4] = 0 # No snow if warm
        if temp < 32 and weights[3] > 0: # Snow instead of rain if freezing
             weights[4] += weights[3]
             weights[3] = 0
             
        condition = random.choices(conditions, weights=weights)[0]
        wind_speed = random.randint(0, 20)
        
        # Impact analysis
        impact_score = 0
        severity = "LOW"
        factors = []
        note = "Good conditions for football."
        
        if condition in ["Rain", "Snow"]:
            impact_score += 5
            factors.append(f"Precipitation: {condition}")
        
        if wind_speed > 15:
            impact_score += 4
            factors.append(f"High Winds: {wind_speed} mph")
        elif wind_speed > 10:
            impact_score += 2
            factors.append(f"Moderate Winds: {wind_speed} mph")
            
        if temp < 20:
            impact_score += 3
            factors.append(f"Extreme Cold: {temp}°F")
        elif temp > 90:
            impact_score += 2
            factors.append(f"Extreme Heat: {temp}°F")
            
        if impact_score >= 7:
            severity = "HIGH"
            note = "Significant weather impact expected. Passing game may be affected."
        elif impact_score >= 4:
            severity = "MEDIUM"
            note = "Moderate weather impact possible."
            
        return {
            "location": f"{location.get('city', 'Unknown')}, {location.get('state', '')}",
            "temperature": temp,
            "condition": condition,
            "wind_speed": f"{wind_speed} mph",
            "precipitation_chance": 0 if condition in ["Clear", "Partly Cloudy"] else random.randint(30, 90),
            "updated_at": datetime.now().isoformat(),
            "correlation_impact": {
                "score": impact_score,
                "severity": severity,
                "factors": factors,
                "note": note
            }
        }
    
    def get_market_context(self, home_team: str, away_team: str, game_date_str: str, league: str = "nfl") -> Dict:
        """
        Get comprehensive market context with enhanced data.
        """
        try:
            game_date = datetime.fromisoformat(game_date_str.replace("Z", ""))
        except ValueError:
            game_date = datetime.now()
        
        home_injuries = self.get_team_injuries(home_team, league)
        away_injuries = self.get_team_injuries(away_team, league)
        
        # Calculate injury impacts
        home_impact = self.calculate_injury_impact(home_injuries, league)
        away_impact = self.calculate_injury_impact(away_injuries, league)
        
        # Get weather
        weather = self._fetch_weather(home_team, game_date, league)
        
        # Get Gemini Intelligence (pass game_date for accurate season/date filtering)
        intelligence = self._get_intelligence_with_gemini(home_team, away_team, league, game_date)
        
        # Enhance injuries with Gemini (pass game_date for context)
        injuries_dict = {"home": home_injuries, "away": away_injuries}
        enhanced_injury_analysis = self._enhance_injuries_with_gemini(injuries_dict, league, game_date)

        return {
            "weather": weather,
            "injuries": injuries_dict,
            "injury_impact": {
                "home": home_impact,
                "away": away_impact
            },
            "news": intelligence.get("news", []),
            "betting_intelligence": intelligence.get("betting_intelligence", []),
            "social_sentiment": intelligence.get("social_sentiment", {}),
            "expert_predictions": intelligence.get("expert_predictions", []),
            "recent_stats": intelligence.get("recent_stats", {}),
            "injury_analysis": enhanced_injury_analysis
        }
    
    def _get_related_news(self, home: str, away: str) -> List[Dict]:
        """Deprecated: Use _get_intelligence_with_gemini instead"""
        return []

    def _query_gemini(self, prompt: str) -> Optional[str]:
        """Query Gemini API with error handling"""
        if not self.gemini_model:
            return None
            
        try:
            # Add retry logic
            for attempt in range(3):
                try:
                    response = self.gemini_model.generate_content(prompt)
                    return response.text
                except Exception as e:
                    if attempt == 2:  # Last attempt
                        raise e
                    import time
                    time.sleep(1 * (attempt + 1))  # Exponential backoff
                    
        except Exception as e:
            logger.error(f"Gemini API query failed: {e}")
            return None

    def _parse_gemini_response(self, response_text: str) -> Dict:
        """Parse Gemini JSON response"""
        if not response_text:
            return {}
            
        try:
            # Clean up markdown code blocks if present
            cleaned_text = response_text.replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned_text)
        except json.JSONDecodeError:
            logger.error("Failed to parse Gemini response as JSON")
            return {}
        except Exception as e:
            logger.error(f"Error parsing Gemini response: {e}")
            return {}

    def _get_intelligence_with_gemini(self, home_team: str, away_team: str, league: str, game_date: datetime) -> Dict:
        """
        Gather comprehensive intelligence using Gemini.
        Returns news, betting info, sentiment, expert picks, and stats.
        """
        if not self.gemini_model:
            return {}

        # Format game date for prompt
        game_date_str = game_date.strftime("%B %d, %Y")
        current_date = datetime.now()
        current_season = current_date.year if current_date.month >= 9 else current_date.year - 1  # NFL/NBA season logic
        
        # Determine if game is in current season
        game_year = game_date.year
        game_month = game_date.month
        if league == "nfl":
            # NFL season: September to February
            game_season = game_year if game_month >= 9 else game_year - 1
        else:  # NBA
            # NBA season: October to June
            game_season = game_year if game_month >= 10 else game_year - 1
        
        is_current_season = game_season == current_season
        season_context = f"the {game_season}-{game_season+1} season" if is_current_season else f"the {game_season}-{game_season+1} season (historical game)"

        prompt = f"""
        You are a professional sports analyst. Analyze the {league.upper()} game scheduled for {game_date_str} between {away_team} (Away) and {home_team} (Home).
        
        IMPORTANT: This game is from {season_context}. Focus ONLY on information relevant to this specific game date and season:
        - News should be from around {game_date_str} or leading up to it
        - Recent stats should reflect performance from {season_context}
        - Expert predictions should be for this specific matchup on {game_date_str}
        - Social sentiment should reflect discussions about this specific game
        
        Provide a comprehensive intelligence report in valid JSON format with the following structure:
        {{
            "news": [
                {{
                    "headline": "string (relevant to {game_date_str})",
                    "source": "string",
                    "sentiment": "POSITIVE|NEGATIVE|NEUTRAL",
                    "url": "string (optional)"
                }}
            ],
            "betting_intelligence": [
                {{
                    "type": "LINE_MOVEMENT|sharp_money|public_money",
                    "description": "string (for game on {game_date_str})",
                    "impact": "HIGH|MEDIUM|LOW"
                }}
            ],
            "social_sentiment": {{
                "home_sentiment": 0.0 to 1.0,
                "away_sentiment": 0.0 to 1.0,
                "trending_topics": ["string (relevant to {game_date_str})"],
                "summary": "string (sentiment about this specific game)"
            }},
            "expert_predictions": [
                {{
                    "expert": "string",
                    "outlet": "string",
                    "prediction": "string (for {game_date_str} game)",
                    "confidence": "HIGH|MEDIUM|LOW"
                }}
            ],
            "recent_stats": {{
                "home_trend": "string (performance in {season_context} leading up to {game_date_str})",
                "away_trend": "string (performance in {season_context} leading up to {game_date_str})",
                "key_stat_diff": "string (comparison relevant to {game_date_str})"
            }}
        }}

        Focus on information specific to {game_date_str} and {season_context}. 
        If this is a historical game, provide context-appropriate historical data.
        If this is a future game, focus on current season trends and recent news.
        Keep the JSON valid and strictly follow the structure.
        """
        
        response = self._query_gemini(prompt)
        return self._parse_gemini_response(response)

    def _enhance_injuries_with_gemini(self, injuries: Dict, league: str, game_date: datetime) -> Dict:
        """
        Enhance injury reports with Gemini analysis.
        """
        if not self.gemini_model or not injuries:
            return {}
            
        # Simplify injury data for prompt
        home_injuries = [f"{i['player_name']} ({i['position']}): {i['status']} - {i['injury_type']}" for i in injuries.get('home', [])]
        away_injuries = [f"{i['player_name']} ({i['position']}): {i['status']} - {i['injury_type']}" for i in injuries.get('away', [])]
        
        if not home_injuries and not away_injuries:
            return {}

        game_date_str = game_date.strftime("%B %d, %Y")
        
        prompt = f"""
        Analyze the following injury report for an {league.upper()} game scheduled for {game_date_str}:
        
        Home Team Injuries:
        {json.dumps(home_injuries)}
        
        Away Team Injuries:
        {json.dumps(away_injuries)}
        
        IMPORTANT: These injuries are for the game on {game_date_str}. Analyze their impact specifically for this game date.
        Consider:
        - Whether injuries are current/relevant for {game_date_str}
        - Recovery timelines relative to {game_date_str}
        - Impact on team performance for this specific matchup
        
        Provide an impact analysis in valid JSON format:
        {{
            "home_impact": {{
                "summary": "string (impact analysis for {game_date_str} game)",
                "severity": "CRITICAL|HIGH|MODERATE|LOW",
                "key_missing": ["string (key players missing for {game_date_str})"]
            }},
            "away_impact": {{
                "summary": "string (impact analysis for {game_date_str} game)",
                "severity": "CRITICAL|HIGH|MODERATE|LOW",
                "key_missing": ["string (key players missing for {game_date_str})"]
            }},
            "matchup_implication": "string (how these injuries affect the specific matchup dynamics for {game_date_str})"
        }}
        """
        
        response = self._query_gemini(prompt)
        return self._parse_gemini_response(response)

