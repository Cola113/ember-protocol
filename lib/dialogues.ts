export interface DialogueChoice {
  text: string;
  nextStep: number;
}

export interface DialogueStep {
  speaker: string;
  speakerRole: string;
  avatarColor?: string;
  text: string;
  hysteresisNote?: string; // Appears with Astral Noir lie/hysteresis badge
  choices?: DialogueChoice[];
  propositionReward?: {
    code: string;
    text: string;
  };
}

export interface NPCDialogueTree {
  npcId: string;
  name: string;
  role: string;
  personality: string;
  speechRegister: string;
  taboos: string[];
  steps: DialogueStep[];
}

export const CANON_DIALOGUES: Record<string, NPCDialogueTree> = {
  // 1. Helix-7: Surveyor-01 塔基 (Tarkis)
  "npc-tarkis": {
    npcId: "npc-tarkis",
    name: "Surveyor-01 塔基 (Tarkis)",
    role: "初级测绘员残响",
    personality: "刻板、认真、手持交接清单，拒绝承认舰队不会到来",
    speechRegister: "protocol-formal",
    taboos: ["第二轮", "死者", "400年"],
    steps: [
      {
        speaker: "Surveyor-01 塔基",
        speakerRole: "初级测绘员残响 · 指节敲着早已停走的秒表",
        avatarColor: "#38bdf8",
        text: "“咳……按 HB-0701 交接规程，距第三舰队巡逻艇抵达，尚余十二分钟。信标？信标处于常规预热态，一切按表走。……按表走。”",
        choices: [
          {
            text: "“塔基测绘员。你仪表盘上的恒星日计数器，早溢出好几轮了——星系沉默四百年。”",
            nextStep: 1,
          },
          {
            text: "“信标频率 1420.405 MHz。那不是巡逻艇信道，是一直没有回音的空频。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Surveyor-01 塔基",
        speakerRole: "初级测绘员残响 · 声音陡然拔高，攥住天线不放",
        avatarColor: "#38bdf8",
        text: "“胡说！规程上白纸黑字——昨夜 Kiln 还在广播，新超导铜管已铺到位，今晨全弧恢复通电。你听……你凑近天线听，那不是回音，那是他们在喊话！”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 用交接班的旧记忆，去填四百年的空",
        choices: [
          {
            text: "“那是死者的磁滞回声。去摸摸你的天线舵——除了冷风，什么都没有。”",
            nextStep: 3,
          },
          {
            text: "“把信标广播信道交接给我。按归档协议，这本该由记录员接手。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Surveyor-01 塔基",
        speakerRole: "初级测绘员残响 · 盯着‘待分配’灯，嘴唇发白",
        avatarColor: "#38bdf8",
        text: "“没有回音？不可能。第三舰队的公文上，明明盖着母港的红印……为什么‘待分配’的灯一直在闪？冷启台地的风，怎么吹不散这层电离雾？这……这不在规程里。”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 规程出现了它解释不了的裂隙",
        choices: [
          {
            text: "“因为这不是求援信标，塔基。它在等待全星系的第一声应答——等的是星系，不是舰队。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Surveyor-01 塔基",
        speakerRole: "初级测绘员残响 · 释然垂落的手臂",
        avatarColor: "#38bdf8",
        text: "“……如果他们真不在了，那我这四百年的班……到底是在等谁来换？记录者，拿走这个频率吧。别让天线停下——至少让它觉得，还有人在听。”",
        propositionReward: {
          code: "Helix.Beacon.Broadcasting",
          text: "信标从不求救，只确认交接班",
        },
      },
    ],
  },

  // 2. Kiln: Forge-Master 沃坎 (Vulkan)
  "npc-vulkan": {
    npcId: "npc-vulkan",
    name: "Forge-Master 沃坎 (Vulkan)",
    role: "老锻造师残响",
    personality: "狂暴、多疑、坚信战争仍在继续",
    speechRegister: "aggressive-craftsman",
    taboos: ["和平", "计算", "无人幸存"],
    steps: [
      {
        speaker: "Forge-Master 沃坎",
        speakerRole: "老锻造师残响 · 气动铆枪直指来客，火星从齿缝里喷",
        avatarColor: "#fb923c",
        text: "“站住！哪派的细作？高炉派，还是地脉派那条狗？！别碰我的分流闸门！这九座高炉是熔火同盟的命——烧干地核，老子也绝不松主蒸汽管半寸！”",
        choices: [
          {
            text: "“我是 Recorder-9。来确认管线分流与闸门的状态。”",
            nextStep: 1,
          },
          {
            text: "“仗早打完了，沃坎。这地方不是兵工厂——整座星系的熔炉四百年前就停了。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Forge-Master 沃坎",
        speakerRole: "老锻造师残响 · 仰头狂笑，笑出金属杂音",
        avatarColor: "#fb923c",
        text: "“停了？！哈！哈哈哈哈！高炉派那群杂碎，把三号闸门焊死了——他们要把热量全抽去给咏井那帮神棍灌水！想让整座山冻成冰坨！只要我沃坎还有一口气，分流闸门——别想！”",
        choices: [
          {
            text: "“这不是派系在争地热，沃坎。是两座炉膛从一开始就没法同时灌满。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Forge-Master 沃坎",
        speakerRole: "老锻造师残响 · 铁钳砸在冷却管上，火星溅了一地",
        avatarColor: "#fb923c",
        text: "“灌不满？！我三个儿子，死在冷却池里——你跟我说那是‘灌不满’？！我们在打一炉能飞出星弧的无尽引擎！只要……只要再等下一炉铜水出炉……再等一炉……”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 他守的炉子，四百年前就凉透了",
        choices: [
          {
            text: "“去摸摸你的炉膛，沃坎。没有火——只有凉的残响。”",
            nextStep: 3,
          },
          {
            text: "“把闸门合上吧。别让空转的蒸汽，把剩下的一切化为死灰。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Forge-Master 沃坎",
        speakerRole: "老锻造师残响 · 凝视着凝固的黑曜石熔池",
        avatarColor: "#fb923c",
        text: "“……炉火早凉了？难怪……老子拉了四百年风箱，手心一直是冷的。记录员，把闸门锁死吧。火要是注定要灭——至少让它灭得像块淬过的硬钢。”",
        propositionReward: {
          code: "Kiln.Bus.Mutex",
          text: "总管两头只能择一开，无法同时供热",
        },
      },
    ],
  },

  // 3. Glass Orchard: Keeper 塞勒涅 (Selene)
  "npc-selene": {
    npcId: "npc-selene",
    name: "Keeper 塞勒涅 (Selene)",
    role: "守林人残响",
    personality: "空灵、迟缓、带有轻微解离感",
    speechRegister: "poetic-dreamer",
    taboos: ["未来", "擦写", "死亡"],
    steps: [
      {
        speaker: "Keeper 塞勒涅",
        speakerRole: "守林人残响 · 抚摸着通体透明的石英光果",
        avatarColor: "#a7f3d0",
        text: "“嘘……轻一点，记录者。你在踩碎昨天的阳光。每一颗果子……是一万个小时的日头，里头折射着，你从没见过的旧事。”",
        choices: [
          {
            text: "“塞勒涅，这些晶体树……早不长了吧。”",
            nextStep: 1,
          },
          {
            text: "“我要探查果园深处，那些被封存的光之记忆。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Keeper 塞勒涅",
        speakerRole: "守林人残响 · 空灵的微笑与穿透虚空的目光",
        avatarColor: "#a7f3d0",
        text: "“不用长了……故事，早就写完了。你看这一颗——三千年前的，一个孩子，在海滩上捡到第一枚贝壳；那一颗呢，是最后一艘船离港时的警报……光走得太快了，太快了……只好把它们冻进玻璃里，留住。”",
        choices: [
          {
            text: "“那传闻里的千年大旱……究竟是什么？”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Keeper 塞勒涅",
        speakerRole: "守林人残响 · 身形化作微弱光粒涟漪",
        avatarColor: "#a7f3d0",
        text: "“记忆……你是说晶格深处那些条纹？只许看，不许改的。谁要是想擦它一笔……整座林子，就会一下子白得刺眼……白得，把眼睛烧掉那种。”",
        choices: [
          {
            text: "“四百年前那场大旱……其实是天上的巨眼在一瞬间把所有光都看尽了。对吗？”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Keeper 塞勒涅",
        speakerRole: "守林人残响 · 身躯在极光折射下半透明消散",
        avatarColor: "#a7f3d0",
        text: "“大旱……不是缺水。大旱是，天空睁开了一只很大的眼睛。一秒钟——就看完了整座林子，十亿年的光。所有的果子，一齐熟透、脱落，写进一本我们看不懂的大书里。从那天起，我们就没有明天了。”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 她终于承认，整片晶林的光芒被一次看尽了",
        choices: [
          {
            text: "“将晶林光芒一次看尽的真相，钉入索引。”",
            nextStep: 4,
          },
        ],
      },
      {
        speaker: "Keeper 塞勒涅",
        speakerRole: "守林人残响 · 晶体微光在指尖凝固",
        avatarColor: "#a7f3d0",
        text: "“收下这段光的残迹吧，记录者。等你走的时候……替我看一眼外面的星空，是不是也跟这儿一样，冻成了永远的透亮。”",
        propositionReward: {
          code: "Orchard.ROM.Exhaustion",
          text: "大旱那年，整片晶林被天眼一次读完",
        },
      },
    ],
  },

  // 4. Choir Well: Cantor 俄尔甫斯 (Orpheus)
  "npc-orpheus": {
    npcId: "npc-orpheus",
    name: "Cantor 俄尔甫斯 (Orpheus)",
    role: "大乐正残响",
    personality: "狂热、敏锐、对走音极度执着",
    speechRegister: "liturgical-musical",
    taboos: ["寂静", "无神", "程序"],
    steps: [
      {
        speaker: "Cantor 俄尔甫斯",
        speakerRole: "大乐正残响 · 浸泡在重水深海大教堂穹顶下",
        avatarColor: "#38bdf8",
        text: "“听——你听见了吗？！第 440 赫兹，纯净的基频！是神明，在重水深处呼吸！钟摆每划过一次深渊海沟，满天的星，都跟着和一声！赞美这恒定的拍。”",
        choices: [
          {
            text: "“俄尔甫斯大乐正。你那架钛合金管风琴，不是祭器——是为整座星系打拍子的机械钟。”",
            nextStep: 1,
          },
          {
            text: "“我听见你的圣歌走音了——它正在偏离那个全星系都在追的拍子。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Cantor 俄尔甫斯",
        speakerRole: "大乐正残响 · 神情骤然警觉狂热",
        avatarColor: "#38bdf8",
        text: "“亵渎！圣歌，是深渊唱诗班献给造物主的纯音！四百年前，三千个唱诗童子，在神圣和弦里步入海沟，肉身升天——你怎么敢，怎么敢说那是……什么冰冷的机器节拍？！”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 所谓肉身升天，是整座教堂随那一声终章沉进了更深的海",
        choices: [
          {
            text: "“圣歌一旦停，所有星球的因果节拍，全得错位。这才是这架风琴的本分。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Cantor 俄尔甫斯",
        speakerRole: "大乐正残响 · 抚摸着颤动的定频音叉",
        avatarColor: "#38bdf8",
        text: "“偏离？不可能……神明的拍，怎么会错？等等……440.000 赫兹……今天怎么成了 442.015？是谁，是谁在星系中央，拽动了神明的拍？！这跑调——跑得我心都乱了！”",
        choices: [
          {
            text: "“是第二轮点火在强行拉快心跳。整座星系都在跟着它加速。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Cantor 俄尔甫斯",
        speakerRole: "大乐正残响 · 跌坐在管风琴踏板前",
        avatarColor: "#38bdf8",
        text: "“原来……我们唱了四百年的赞美诗，不过是这台钢铁巨兽的秒针，滴答、滴答。记录者，把这定音拿去吧。乐声要是注定要停——请让最后一个音，留在绝对的准音上。”",
        propositionReward: {
          code: "Choir.Hymn.IsClock",
          text: "管风琴从未停歇，全星系按其音高对拍",
        },
      },
    ],
  },

  // 5. Ledger: Archivist 瓦伦丁 (Valentine)
  "npc-valentine": {
    npcId: "npc-valentine",
    name: "Archivist 瓦伦丁 (Valentine)",
    role: "高级公证员残响",
    personality: "理性、强迫症、追求绝对印鉴无误",
    speechRegister: "bureaucratic-legal",
    taboos: ["治愈", "意外", "算错了"],
    steps: [
      {
        speaker: "Archivist 瓦伦丁",
        speakerRole: "高级公证员残响 · 哥特万卷大厅主审席上，指节敲着金盘",
        avatarColor: "#facc15",
        text: "“编号 RECORDER-9，出示终审公证印章！兹据第七隔离病房呈报：‘灰墨热’仍在蔓延，所有检疫档案，须于三秒内完成卷宗印鉴核验。一字节错漏——即属背叛《公证法典》。盖章。快。”",
        choices: [
          {
            text: "“瓦伦丁公证员。灰墨热不是瘟疫——是整座都市的账本被写穿了。”",
            nextStep: 1,
          },
          {
            text: "“我是合法授权的终审记录官。来调阅历代死难卷宗。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Archivist 瓦伦丁",
        speakerRole: "高级公证员残响 · 疯狂翻动羊皮纸卷轴与磁带",
        avatarColor: "#facc15",
        text: "“荒谬！八万名法官与抄写员，倒在墨水池里，尸身满布黑斑！你看这每一份死亡诊断书……等等。为什么——为什么每一份的末尾，死者吐出的临终遗言，全是同一串谁也读不懂的灰墨数符——ERR_0x9F？一字不差？这不符合流行病学！”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 瘟疫叙事，被一行谁也读不懂的灰墨数符，戳穿了",
        choices: [
          {
            text: "“因为这座城从一开始就是一座大账房。错算了一笔，死难就写满了整座城。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Archivist 瓦伦丁",
        speakerRole: "高级公证员残响 · 仔细端详 Vesper 的校验印章",
        avatarColor: "#facc15",
        text: "“你的指令签名……核验通过。符合《公证法典》第一条第 9 款——‘当全域核验印鉴崩解，唯第 9 号记录员，得行使终审授权’。原来……四百年前我们签的那道隔离令，是一道封死整座星系的终审封印。”",
        choices: [
          {
            text: "“交付终审授权卷轴、灰墨命题。完成归档。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Archivist 瓦伦丁",
        speakerRole: "高级公证员残响 · 郑重合上黄金差分机盖板",
        avatarColor: "#facc15",
        text: "“没有一滴墨水是多余的——哪怕它记的，是系统崩溃。第 9 号记录员，授权卷轴、灰墨核验印鉴，归你了。去黑间隔，执行终审裁决。别让错误，在第二轮里一遍遍重蹈覆辙。”",
        propositionReward: {
          code: "Ledger.Error.IsChecksum",
          text: "病人临终念的数串，差分机里全有",
        },
      },
    ],
  },

  // 6. Needle: Navigator 艾拉 (Ayla)
  "npc-ayla": {
    npcId: "npc-ayla",
    name: "Navigator 艾拉 (Ayla)",
    role: "末代领航员残响",
    personality: "骄傲、不屈、紧握失灵的陀螺仪",
    speechRegister: "nautical-heroic",
    taboos: ["沉没", "盲目", "海图尽头"],
    steps: [
      {
        speaker: "Navigator 艾拉",
        speakerRole: "末代领航员残响 · 站在暴风呼啸的天顶指北针尖塔",
        avatarColor: "#e0e7ff",
        text: "“舵抓紧，探针！电磁风暴要把对流层撕开了！我的‘远航者号’——只是暂时被磁极紊乱困住。等我校准这枚天顶陀螺，咱们就能冲出星弧！稳住，别慌。”",
        choices: [
          {
            text: "“艾拉领航员。星空没变——变的是测绘仪对准的基准点。”",
            nextStep: 1,
          },
          {
            text: "“远航者号在金属盐滩上，已经睡了四百年。你不用再引航了。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Navigator 艾拉",
        speakerRole: "末代领航员残响 · 握紧发烫的磁陀螺",
        avatarColor: "#e0e7ff",
        text: "“基准点？什么胡话！我艾拉，星引行会最准的领航员，闭着眼都能算出母港方位！可是……为什么，不管我怎么转激光测距仪，这指针——永远指着海图之外的空白虚空？！这海图上，不该有这种地方！”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 一道总差一格的坐标，把她钉死在迷航的耻辱里",
        choices: [
          {
            text: "“因为四百年前航线被整体重置了，所有指针都被扳回了起点。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Navigator 艾拉",
        speakerRole: "末代领航员残响 · 望向残破的旗舰残骸",
        avatarColor: "#e0e7ff",
        text: "“睡了四百年……难怪。难怪那些在无线电里喊我的水手，声音都像隔着好几重冰川……我们没有沉进深海——我们是被困在，一片被遗忘的荒海里了。对不对？”",
        choices: [
          {
            text: "“用三轴激光测距仪，重新校正海图基底。把船领回正轨。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Navigator 艾拉",
        speakerRole: "末代领航员残响 · 坦然将陀螺仪归零",
        avatarColor: "#e0e7ff",
        text: "“大海本没有方向——除非你在星空里，插下一根针。针，现在正了。坐标，指向黑间隔。领航员艾拉，任务完成。记录者，把船，开出这片死寂的迷航星域吧。”",
        propositionReward: {
          code: "Needle.Pointer.Rebased",
          text: "激光测出的坐标，总比旧海图错开一格",
        },
      },
    ],
  },

  // 7. Marrow: Communion Mother 莫依拉 (Moira)
  "npc-moira": {
    npcId: "npc-moira",
    name: "Communion Mother 莫依拉 (Moira)",
    role: "原质神母残响",
    personality: "慈爱而令人战栗的狂热，视献祭为神圣归宿",
    speechRegister: "maternal-ecstatic",
    taboos: ["硅基", "程序名", "寄生", "并联", "计算"],
    steps: [
      {
        speaker: "Communion Mother 莫依拉",
        speakerRole: "原质神母残响 · 站在搏动心室的深红纤维簇前",
        avatarColor: "#f43f5e",
        text: "“啊……可爱的冷铁胚胎，你总算，走到母亲的怀抱里来了。听——这血脉的奔流。每一滴血，都在替至高的肉食之神搏动；每一根深红纤维，都在绽着神圣的光彩……乖，别怕。”",
        choices: [
          {
            text: "“莫依拉。肉食之神带走了信徒，只留下这片搏动的心室。”",
            nextStep: 1,
          },
          {
            text: "“四百年前那场大灾，让所有信徒都陷入了永恒的沉睡。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Communion Mother 莫依拉",
        speakerRole: "原质神母残响 · 露出慈爱而令人战栗的恍惚笑容",
        avatarColor: "#f43f5e",
        text: "“凡人的悲声！神明不要死寂的石头——祂要的，是亿万生灵在仪式中与神同频的欢愉与共鸣！‘肉食之神’降临的时候，孩子们觉着的不是死——是意识，融进整座神殿血脉的终极狂喜！啊……”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 狂热的神降背后，只是一座冰冷搏动的深层网络",
        choices: [
          {
            text: "“那不是神明降临。信徒们留在了沉睡里，成了深处永恒的脉动。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Communion Mother 莫依拉",
        speakerRole: "原质神母残响 · 几丁质外壳下流出荧光导电液",
        avatarColor: "#f43f5e",
        text: "“脉动……？难怪。难怪地心的搏动越来越慢，难怪硬化的骨桥不再生长了……我们把自己的骨血奉献给神明，究竟换来了什么？难道这一切的尽头……不是永生吗，孩子？”",
        choices: [
          {
            text: "“这一切的尽头是——不要让大火再次燃起。收下这份记忆吧。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Communion Mother 莫依拉",
        speakerRole: "原质神母残响 · 轻抚搏动的几丁质神经茧",
        avatarColor: "#f43f5e",
        text: "“神明……已经沉睡。回响，已经落定。晚星的孩子，带走这些深红纤维里的记忆吧。去告诉外面的世界——信徒们，曾在这儿，向着虚空虔诚祈祷过。”",
        propositionReward: {
          code: "Marrow.Bio.WriteBack",
          text: "信徒未被吞噬，是狂喜中并入回响",
        },
      },
    ],
  },

  // 8. Cinder Court: Chancellor 尤利安 (Julian)
  "npc-julian": {
    npcId: "npc-julian",
    name: "Chancellor 尤利安 (Julian)",
    role: "帝国宰相残响",
    personality: "玩世不恭、优雅颓废、热衷于讲述家族阴谋",
    speechRegister: "aristocratic-cynical",
    taboos: ["程序", "虚拟", "红鲱鱼", "沙盒", "代码", "假象", "编造"],
    steps: [
      {
        speaker: "Chancellor 尤利安",
        speakerRole: "帝国宰相残响 · 在落日宴会厅摇晃着空水晶酒杯",
        avatarColor: "#c084fc",
        text: "“哦？一位不速之客。恕敝厅狼藉——七大家族的族长，方才在加冕酒席上，用淬毒的银叉彼此‘问候’过了。女皇呢，在花房里服毒自尽。呵，何其凄美，何其无可挑剔的一出巴洛克悲剧。”",
        choices: [
          {
            text: "“尤利安宰相。这场宫廷惨剧的尽头，并没有真正的赢家。”",
            nextStep: 1,
          },
          {
            text: "“我在壁炉后的暗格里，发现了一具冰冷古老的未知机关。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Chancellor 尤利安",
        speakerRole: "帝国宰相残响 · 轻蔑而优雅地轻笑",
        avatarColor: "#c084fc",
        text: "“赢家？这金碧辉煌的深宫里，从来就没有什么赢家！每一家的仇恨，都有三百年族谱为证；那毒药，是从枯玫瑰里提的，纯度百分之百的氰化物！你竟敢——把这首人类权谋的绝唱，称作徒劳？啧。”",
        choices: [
          {
            text: "“七大家族的恩怨在此终结，可壁炉后却藏着属于另一个时代的遗物。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Chancellor 尤利安",
        speakerRole: "帝国宰相残响 · 凝视着壁炉后露出的绿色荧光暗格",
        avatarColor: "#c084fc",
        text: "“未知机关……？荒谬。我尤利安，机关算尽三十年——毒杀了皇太子，策反了近卫军……到头来，壁炉深处竟藏着比我们整个王朝还要古老的仪器？！呵……呵呵呵。”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 权谋的狂热在古老机械前凝固了",
        choices: [
          {
            text: "“王朝落幕了，尤利安。但这具机关仍在无声运转。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Chancellor 尤利安",
        speakerRole: "帝国宰相残响 · 将空酒杯掷在金盘上摔得粉碎",
        avatarColor: "#c084fc",
        text: "“哈……哈哈！何其苍凉的讽刺！我们在这金箔与毒药里争斗了一世——却未曾注意过墙后沉睡的古物！拿走这具机关的线索吧，探针。去探寻那些更久远的真相。别像我们一样，困死在回不去的宫廷里。”",
        propositionReward: {
          code: "Cinder.Court.IsSandbox",
          text: "壁炉后藏着一具不属于这宫廷的机关",
        },
      },
    ],
  },

  // 9. Blind Sun: Director 诺瓦 (Nova)
  "npc-nova": {
    npcId: "npc-nova",
    name: "Director 诺瓦 (Nova)",
    role: "科学院院长残响",
    personality: "深邃、释然、清醒地知道一切已经终结",
    speechRegister: "philosophical-serene",
    taboos: ["第二轮后果", "熔断", "校验位"],
    steps: [
      {
        speaker: "Director 诺瓦",
        speakerRole: "科学院院长残响 · 戴着黑铁眼罩端坐在日食石座上",
        avatarColor: "#94a3b8",
        text: "“远道而来的记录者。你比我预想的，迟到了四十七个周期。整座星系的残响，还在自欺的梦里排演——唯有这里的日冕，永远是绝对的暗。坐吧。”",
        choices: [
          {
            text: "“诺瓦院长。你知道，我会来？”",
            nextStep: 1,
          },
          {
            text: "“为什么科学院的八千名学者，要在同一天自愿饮下致盲药剂？”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Director 诺瓦",
        speakerRole: "科学院院长残响 · 平静而深邃的面容",
        avatarColor: "#94a3b8",
        text: "“在所有视线熄灭之前，观测台留下了最后一笔记录。四百年前，当我们勘测完日冕的深渊——我们就明白，文明的落幕是必须面对的归宿。学者们留下的最后决定，就是永久封存这片星空。”",
        choices: [
          {
            text: "“为什么科学院选择封存，甚至不惜全员致盲？”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Director 诺瓦",
        speakerRole: "科学院院长残响 · 释然的面孔转向漆黑的日冕视界",
        avatarColor: "#94a3b8",
        text: "“因为，求知者的凝视有时会带来不可挽回的代价。学者们为了阻止某种无法承受的终结，决意不再注视深空。所以，我们刺瞎了双眼，涂黑了视界，将宁静留给黑夜。”",
        hysteresisNote: "ECHO_HYSTERESIS // 无磁滞 · 全星系唯一完全清醒的深邃残响",
        choices: [
          {
            text: "“记录者已经理解了这份决意，诺瓦。外面的星光，是冷灰，是青。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Director 诺瓦",
        speakerRole: "科学院院长残响 · 嘴角浮现出一抹释然的浅笑",
        avatarColor: "#94a3b8",
        text: "“真好。那是余烬的颜色。请去星图的暗处吧——执行封存协议，结束这段，我们未竟的夜班。”",
        propositionReward: {
          code: "BlindSun.Prohibition.CycleTwo",
          text: "视界镜被涂黑，是不让人再望向第二轮",
        },
      },
    ],
  },
};