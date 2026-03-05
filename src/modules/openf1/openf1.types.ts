export interface OpenF1Meeting {
    circuit_key:              number;
    circuit_short_name:       string;
    circuit_type:             string | null;
    circuit_info_url:         string | null;
    circuit_image:            string | null;
    country_code:             string;
    country_key:              number;
    country_name:             string;
    country_flag:             string | null;
    date_start:               string;
    date_end:                 string | null;
    gmt_offset:               string;
    location:                 string;
    meeting_key:              number;
    meeting_name:             string;
    meeting_official_name:    string;
    year:                     number;
}

export interface OpenF1Session {
    circuit_key:        number;
    circuit_short_name: string;
    country_code:       string;
    country_key:        number;
    country_name:       string;
    date_end:           string;
    date_start:         string;
    gmt_offset:         string;
    location:           string;
    meeting_key:        number;
    session_key:        number;
    session_name:       string;
    session_type:       string;
    year:               number;
}

export interface OpenF1Driver {
    broadcast_name: string;
    country_code:   string;
    driver_number:  number;
    first_name:     string;
    full_name:      string;
    headshot_url:   string | null;
    last_name:      string;
    meeting_key:    number;
    name_acronym:   string;
    session_key:    number;
    team_colour:    string;
    team_name:      string;
}

export interface OpenF1RaceControl {
    date:           string;
    driver_number:  number | null;
    flag:           string | null;
    lap_number:     number | null;
    message:        string;
    meeting_key:    number;
    scope:          string | null;
    sector:         number | null;
    session_key:    number;
}

export interface OpenF1Position {
    date:           string;
    driver_number:  number;
    meeting_key:    number;
    position:       number;
    session_key:    number;
}

export interface OpenF1Lap {
    date_start:         string;
    driver_number:      number;
    duration_sector_1:  number | null;
    duration_sector_2:  number | null;
    duration_sector_3:  number | null;
    is_pit_out_lap:     boolean;
    lap_duration:       number | null;
    lap_number:         number;
    meeting_key:        number;
    session_key:        number;
    st_speed:           number | null;
}

export interface OpenF1Interval {
    date:           string;
    driver_number:  number;
    gap_to_leader:  number | null;
    interval:       number | null;
    meeting_key:    number;
    session_key:    number;
}

export interface OpenF1SessionParams {
    meeting_key?:   number;
    session_type?:  string;
    year?:          number;
}

export interface OpenF1MeetingParams {
    year?:          number;
    country_code?:  string;
    circuit_key?:   number;
}
