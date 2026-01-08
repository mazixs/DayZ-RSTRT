class CfgPatches
{
	class RSTRT_Mod
	{
		units[]={};
		weapons[]={};
		requiredVersion=0.1;
		requiredAddons[]=
		{
			"DZ_Data",
			"DZ_Scripts"
		};
	};
};

class CfgMods
{
	class RSTRT_Mod
	{
		dir="RSTRT_Mod";
		picture="";
		action="";
		hideName=1;
		hidePicture=1;
		name="DayZ-RSTRT-Mod";
		credits="mazix";
		author="mazix";
		authorID="0";
		version="1.0";
		extra=0;
		type="mod";
		
		dependencies[]=
		{
			"Mission"
		};
		
		class defs
		{
			class missionScriptModule
			{
				value="";
				files[]=
				{
					"server-mod/Scripts/5_Mission"
				};
			};
		};
	};
};
