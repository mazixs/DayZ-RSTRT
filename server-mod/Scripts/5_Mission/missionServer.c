class RSTRTConfig
{
    string Endpoint;

    void RSTRTConfig()
    {
        Endpoint = "http://127.0.0.1:3000/api/telemetry";
    }
}

class RSTRT_RestCallback : RestCallback
{
    override void OnError(int errorCode)
    {
        Print("[RSTRT] Telemetry POST Error. Code: " + errorCode);
    }

    override void OnTimeout()
    {
        Print("[RSTRT] Telemetry POST Timeout");
    }

    override void OnSuccess(string data, int dataSize)
    {
        // Debug only: Print("[RSTRT] Telemetry Sent. Response: " + data);
    }
}

modded class MissionServer
{
    private RestContext m_RstrtApi;
    private string m_RstrtEndpoint;
    private ref RSTRTConfig m_RstrtConfig;
    private ref RSTRT_RestCallback m_RstrtCallback;
    private ref array<Man> m_Rstrt_Players; // Reuse array to reduce GC

    // FPS Calculation Variables
    private float m_Rstrt_FpsTimer = 0;
    private int m_Rstrt_FrameCount = 0;
    private float m_Rstrt_CurrentFps = 60.0; // Default start value

    override void OnInit()
    {
        super.OnInit();
        Print("[RSTRT] Mod Initializing...");
        
        m_RstrtCallback = new RSTRT_RestCallback();
        m_Rstrt_Players = new array<Man>;

        // 1. Load Configuration
        m_RstrtConfig = new RSTRTConfig();
        string profileDir = "$profile:DayZ-RSTRT";
        string cfgPath = profileDir + "/config.json";

        if (!FileExist(profileDir))
        {
            MakeDirectory(profileDir);
        }

        if (FileExist(cfgPath))
        {
            JsonFileLoader<RSTRTConfig>.JsonLoadFile(cfgPath, m_RstrtConfig);
            Print("[RSTRT] Config loaded. Endpoint: " + m_RstrtConfig.Endpoint);
        }
        else
        {
            JsonFileLoader<RSTRTConfig>.JsonSaveFile(cfgPath, m_RstrtConfig);
            Print("[RSTRT] Default config created at: " + cfgPath);
        }

        m_RstrtEndpoint = m_RstrtConfig.Endpoint;
        
        // 2. Setup RestApi
        // Note: RestApi module must be enabled in server config or startup parameters
        RestApi api = GetRestApi();
        if (api)
        {
            m_RstrtApi = api.GetRestContext(m_RstrtEndpoint);
            if (m_RstrtApi)
            {
                Print("[RSTRT] Connected to RestApi context: " + m_RstrtEndpoint);
                // Start Telemetry Loop - 5 seconds interval
                GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(Rstrt_SendTelemetry, 5000, true);
            }
            else
            {
                Print("[RSTRT] Failed to create RestContext for " + m_RstrtEndpoint);
            }
        }
        else
        {
            Print("[RSTRT] RestApi module is NOT available. Ensure it is enabled.");
        }
    }

    override void OnUpdate(float timeslice)
    {
        super.OnUpdate(timeslice);
        
        // Manual FPS Calculation
        m_Rstrt_FpsTimer += timeslice;
        m_Rstrt_FrameCount++;

        if (m_Rstrt_FpsTimer >= 1.0)
        {
            m_Rstrt_CurrentFps = m_Rstrt_FrameCount / m_Rstrt_FpsTimer;
            m_Rstrt_FrameCount = 0;
            m_Rstrt_FpsTimer = 0;
        }
    }

    void Rstrt_SendTelemetry()
    {
        if (!m_RstrtApi) return;

        // 1. Gather Data
        float fps = m_Rstrt_CurrentFps;
        
        // Get In-Game Time
        int year, month, day, hour, minute;
        GetGame().GetWorld().GetDate(year, month, day, hour, minute);
        
        m_Rstrt_Players.Clear();
        GetGame().GetPlayers(m_Rstrt_Players);
        int playerCount = m_Rstrt_Players.Count();

        // 2. Build JSON Manually
        // Optimization: Reduce string concatenations
        string json = "{\"fps\":" + fps.ToString() + ",\"gameTime\":{\"hour\":" + hour + ",\"minute\":" + minute + ",\"day\":" + day + ",\"month\":" + month + ",\"year\":" + year + "},\"playerCount\":" + playerCount.ToString() + ",\"timestamp\":" + GetGame().GetTime().ToString() + ",\"players\":[";
        
        if (playerCount > 0)
        {
            for (int i = 0; i < playerCount; i++)
            {
                PlayerBase pb = PlayerBase.Cast(m_Rstrt_Players.Get(i));
                if (pb && pb.GetIdentity())
                {
                    string id = pb.GetIdentity().GetPlainId(); 
                    string name = pb.GetIdentity().GetName();
                    vector pos = pb.GetPosition();
                    float health = pb.GetHealth("","");
                    
                    // Simple escape for quotes
                    name.Replace("\"", "'"); 
                    
                    // Format float/vector to reduce string size
                    string posStr = string.Format("%1 %2 %3", pos[0].ToString(), pos[1].ToString(), pos[2].ToString());
                    string healthStr = ((int)health).ToString();
                    
                    // Use Format to minimize string object creation during concatenation
                    string playerEntry = string.Format("{\"id\":\"%1\",\"name\":\"%2\",\"pos\":\"%3\",\"health\":%4}", id, name, posStr, healthStr);
                    
                    json += playerEntry;
                    if (i < playerCount - 1) json += ",";
                }
            }
        }
        
        json += "]}";

        // 3. Send Data
        // Use our custom callback to capture specific error codes
        if (m_RstrtCallback)
        {
            m_RstrtApi.POST(m_RstrtCallback, "", json);
        }
    }
}
