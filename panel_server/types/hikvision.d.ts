export interface UserInfoSearchResponse {
    UserInfoSearch: {
        searchID: string;
        responseStatusStrg: "OK" | "NO MATCH" | "MORE";
        numOfMatches: number;
        totalMatches: number;
        UserInfo: UserInfo[];
    };
}

export interface EventInfoSearchResponse {
    AcsEvent: {
        searchID: string;
        responseStatusStrg: "OK" | "NO MATCH" | "MORE";
        numOfMatches: number;
        totalMatches: number;
        InfoList: any[];
    };
}

export interface UserInfo {
    employeeNo: string;
    name: string;
    userType: "normal" | "blackList" | "visitor"
    closeDelayEnabled: boolean;
    Valid: {
        enable: boolean;
        beginTime: string; // Formato ISO 8601 (2037-12-31T23:59:59)
        endTime: string; // Formato ISO 8601 (2037-12-31T23:59:59)
        timeType: "local";
    };
    belongGroup: string;
    password: string;
    doorRight: string;
    RightPlan: {
        doorNo: number;
        planTemplateNo: string;
    }[];
    maxOpenDoorTime: number;
    openDoorTime: number;
    roomNumber: number;
    floorNumber: number;
    localUIRight: boolean;
    gender: "male" | "female" | "unknown";
    numOfCard: number;
    numOfFace: number;
    PersonInfoExtends: {
        value: string;
    }[];
}

export interface UserInfoSavedResponse {
    statusCode: 1 | number;
    statusString: "OK" | string;
    subStatusCode: "ok" | string;
    errorCode: number;
    errorMsg: string;
}