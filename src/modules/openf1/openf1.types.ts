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

export interface OpenF1Weather {
    air_temperature:    number;
    date:               string;
    humidity:           number;
    meeting_key:        number;
    pressure:           number;
    rainfall:           number;
    session_key:        number;
    track_temperature:  number;
    wind_direction:     number;
    wind_speed:         number;
}

export interface OpenF1Pit {
    date:           string;
    driver_number:  number;
    lap_number:     number;
    meeting_key:    number;
    pit_duration:   number | null;
    session_key:    number;
}

export interface OpenF1Stint {
    compound:           string;
    driver_number:      number;
    lap_end:            number;
    lap_start:          number;
    meeting_key:        number;
    session_key:        number;
    stint_number:       number;
    tyre_age_at_start:  number;
}

export interface OpenF1Location {
    date:           string;
    driver_number:  number;
    meeting_key:    number;
    session_key:    number;
    x:              number;
    y:              number;
    z:              number;
}

export interface OpenF1TeamRadio {
    date:           string;
    driver_number:  number;
    meeting_key:    number;
    recording_url:  string;
    session_key:    number;
}

export interface OpenF1Team {
    team_name:   string;
    team_colour: string;
    drivers:     Pick<OpenF1Driver, "driver_number" | "name_acronym" | "full_name" | "headshot_url">[];
}

export interface OpenF1DriverParams {
    session_key?:  number | string;
    name_acronym?: string;
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
