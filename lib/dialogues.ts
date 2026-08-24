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
        speakerRole: "初级测绘员残响 · 手持泛黄交接清单",
        avatarColor: "#38bdf8",
        text: "“我的交接班记录上写得很清楚，距第三舰队的巡逻艇到达还有十二分钟。信标只是在……只是在做常规的开机预热。”",
        choices: [
          {
            text: "“塔基测绘员，你的仪表盘恒星日计数器早已溢出了。星系已经沉默了四百年。”",
            nextStep: 1,
          },
          {
            text: "“信标的载波频率是 1420.405 MHz，那不是巡逻艇信道，是引导扇区握手代码。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Surveyor-01 塔基",
        speakerRole: "初级测绘员残响 · 手持泛黄交接清单",
        avatarColor: "#38bdf8",
        text: "“胡说！我昨晚还听到了 Kiln 传来的熔炉广播！他们说新的超导铜管已经铺设完毕，今天全星系都要通电！你仔细听……那不是回音，那是他们在说话！”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 对方在用记忆填补四百年的虚无",
        choices: [
          {
            text: "“那是死者的磁滞回声。摸摸你的天线舵，除了冷风什么都没有。”",
            nextStep: 3,
          },
          {
            text: "“把信标的广播信道交接给我吧，这是记录员的归档协议。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Surveyor-01 塔基",
        speakerRole: "初级测绘员残响 · 手持泛黄交接清单",
        avatarColor: "#38bdf8",
        text: "“引导代码？不可能……第三舰队的公文上明明盖着母港的红印……为什么‘待分配’的指示灯一直在闪烁？为什么冷启台地的风吹不散电离雾？”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 逻辑产生微小自相矛盾裂隙",
        choices: [
          {
            text: "“因为这是一台恒星计算机的开机信标，它在等整个星系唤醒，而不是舰队。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Surveyor-01 塔基",
        speakerRole: "初级测绘员残响 · 释然垂落的手臂",
        avatarColor: "#38bdf8",
        text: "“……如果他们真的不在了，那我这四百年来到底是在等谁换班？记录者，拿走这个频率吧。别让天线停下，至少让它觉得，还有人在听。”",
        propositionReward: {
          code: "Helix.Beacon.Broadcasting",
          text: "Helix-7 校准信标常驻引导广播",
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
        speakerRole: "老锻造师残响 · 手持重型气动铆枪",
        avatarColor: "#fb923c",
        text: "“站住，探针！你是高炉派派来的细作，还是地脉派的狗？！别碰我的总线阀门！这九座高炉是同盟的生命线，哪怕烧干地核，我们也绝不交出电源母线的控制权！”",
        choices: [
          {
            text: "“我是 Recorder-9。我来确认能量总线与互斥锁的状态。”",
            nextStep: 1,
          },
          {
            text: "“战争早已结束了，沃坎。这里不是兵工厂，是恒星计算机的电源总线。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Forge-Master 沃坎",
        speakerRole: "老锻造师残响 · 暴烈而嘶哑的嗓音",
        avatarColor: "#fb923c",
        text: "“总线？哈哈！高炉派那群杂碎把三号闸门焊死了，他们想把所有的热量都抽去给咏井灌水！他们想让整座山冻结！只要我沃坎还剩一口气，互斥锁就绝不会交给他们！”",
        choices: [
          {
            text: "“这不是派系战争，沃坎。这是两组不能并发执行的硬件指令在争夺总线。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Forge-Master 沃坎",
        speakerRole: "老锻造师残响 · 铁钳颤抖地砸在冷却管上",
        avatarColor: "#fb923c",
        text: "“指令？！我的三个儿子死在冷却池里，你跟我说那是‘指令’？！我们在造能飞出星弧的无尽引擎！只要……只要下一炉铜水出炉……”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 锻炉早在四百年前已经冷却固化",
        choices: [
          {
            text: "“摸摸你的炉膛，沃坎。没有火，只有冰冷的残响。”",
            nextStep: 3,
          },
          {
            text: "“把互斥锁合上吧，沃坎。别让短路的电流把一切烧成死灰。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Forge-Master 沃坎",
        speakerRole: "老锻造师残响 · 凝视着凝固的黑曜石熔池",
        avatarColor: "#fb923c",
        text: "“……炉火已经凉了？难怪……无论我怎么拉风箱，手心都是冷的。记录员，把总线互斥锁合上吧。如果火注定要熄灭，至少让它死得像块硬钢。”",
        propositionReward: {
          code: "Kiln.Bus.Mutex",
          text: "Kiln 总线互斥锁与硬件总线控制权",
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
        text: "“嘘……轻一点，记录者。你在踩碎昨天的阳光。每一颗果实都是一万小时的阳光，折射出你未曾见过的往事。”",
        choices: [
          {
            text: "“塞勒涅，这些晶体树木已经不再生长了。”",
            nextStep: 1,
          },
          {
            text: "“我需要调取果园深处的只读数据矩阵。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Keeper 塞勒涅",
        speakerRole: "守林人残响 · 空灵的微笑与穿透虚空的目光",
        avatarColor: "#a7f3d0",
        text: "“它们不需要生长了，因为所有的故事都已经写完了。你看这一颗，里面记录着三千年前一个孩子在海滩上捡到的第一枚贝壳；那一颗记录着最后一艘飞船离开母港时的警报声……光走得太快，所以必须把它们冻在玻璃里。”",
        choices: [
          {
            text: "“那么传闻中的千年大旱，究竟是什么？”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Keeper 塞勒涅",
        speakerRole: "守林人残响 · 身形化作微弱光粒涟漪",
        avatarColor: "#a7f3d0",
        text: "“矩阵？你是说那些刻在晶格深处的条纹吗？它们只许看，不许改。任何试图擦写晶体的企图，都会让整座森林化作刺目的白芒……”",
        choices: [
          {
            text: "“四百年前的大旱，其实是一次全区只读读取过载，对吗？”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Keeper 塞勒涅",
        speakerRole: "守林人残响 · 身躯在极光折射下半透明消散",
        avatarColor: "#a7f3d0",
        text: "“大旱不是缺水。大旱是……天空睁开了一只巨大的眼睛。它在一秒钟里读完了整座森林十亿年的光。所有的果子在一瞬间熟透、剥离、写进了一本我们看不懂的巨著里。从那天起，我们就不再拥有明天了。”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 确认只读光存储全区耗尽（Read-Out Exhaustion）",
        choices: [
          {
            text: "“将果园的 ROM 耗尽命题钉入索引。”",
            nextStep: 4,
          },
        ],
      },
      {
        speaker: "Keeper 塞勒涅",
        speakerRole: "守林人残响 · 晶体微光在指尖凝固",
        avatarColor: "#a7f3d0",
        text: "“收下这段光的残迹吧，记录者。当你离开时，请替我看看外面的星空，是不是也像这里一样，被冻结成了永恒的透明。”",
        propositionReward: {
          code: "Orchard.ROM.Exhaustion",
          text: "Glass Orchard 全区只读存储读取耗尽",
        },
      },
    ],
  },

  // 4. Choir Well: Cantor 俄尔甫斯 (Orpheus)
  "npc-orpheus": {
    npcId: "npc-orpheus",
    name: "Cantor 俄尔甫斯 (Orpheus)",
    role: "大乐正残响",
    personality: "狂热、敏锐、对相位差极度执着",
    speechRegister: "liturgical-musical",
    taboos: ["寂静", "无神", "程序"],
    steps: [
      {
        speaker: "Cantor 俄尔甫斯",
        speakerRole: "大乐正残响 · 浸泡在重水深海大教堂穹顶下",
        avatarColor: "#38bdf8",
        text: "“听……你听到了吗？！第 440 赫兹的纯净基频！神明在重水深处呼吸！每当钟摆划过深渊海沟，整座星系的星辰都在为之共鸣！”",
        choices: [
          {
            text: "“俄尔甫斯大乐正，你的钛合金管风琴不是祭祀乐器，是恒星计算机的压电晶振。”",
            nextStep: 1,
          },
          {
            text: "“我听到了你引擎里的相位差，你的圣歌正在偏离基频。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Cantor 俄尔甫斯",
        speakerRole: "大乐正残响 · 神情骤然警觉狂热",
        avatarColor: "#38bdf8",
        text: "“亵渎！圣歌是深渊唱诗班奉献给造物主的纯音！四百年前，三千名唱诗童子在神圣和弦中步入海沟肉身升天！你怎么敢说那是……那是电路的时钟脉冲？！”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 所谓肉身升天实为第一轮时钟同步坍缩",
        choices: [
          {
            text: "“如果圣歌停下，所有星球的因果节拍就会错位。这就是晶振的职责。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Cantor 俄尔甫斯",
        speakerRole: "大乐正残响 · 抚摸着颤动的定频音叉",
        avatarColor: "#38bdf8",
        text: "“偏离？不可能……神明的节拍怎么会错？等等……440.000 Hz……为什么今天变成了 442.015 Hz？是谁在星系中央拉动了时钟分频器？！”",
        choices: [
          {
            text: "“是第二轮计算的自催化预热。它在强行超频这台沉睡的计算机。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Cantor 俄尔甫斯",
        speakerRole: "大乐正残响 · 跌坐在管风琴踏板前",
        avatarColor: "#38bdf8",
        text: "“原来……我们唱了四百年的赞美诗，不过是这台钢铁巨兽的秒针在滴答作响。记录者，把这个基频拿去吧。若时钟注定要停止，请让最后一个音符保持绝对准音。”",
        propositionReward: {
          code: "Choir.Hymn.IsClock",
          text: "Choir Well 圣歌即中央时钟基频晶振",
        },
      },
    ],
  },

  // 5. Ledger: Archivist 瓦伦丁 (Valentine)
  "npc-valentine": {
    npcId: "npc-valentine",
    name: "Archivist 瓦伦丁 (Valentine)",
    role: "高级公证员残响",
    personality: "理性、强迫症、追求绝对哈希对齐",
    speechRegister: "bureaucratic-legal",
    taboos: ["治愈", "意外", "算错了"],
    steps: [
      {
        speaker: "Archivist 瓦伦丁",
        speakerRole: "高级公证员残响 · 哥特万卷大厅的主审席",
        avatarColor: "#facc15",
        text: "“编号 RECORDER-9，出示你的终审公证印章！第七隔离病房的‘灰墨热’仍在蔓延，所有的检疫档案必须在三秒内完成 SHA-256 校验和对齐！任何一个字节的错漏都是对法律的背叛！”",
        choices: [
          {
            text: "“瓦伦丁公证员，灰墨热根本不是生物瘟疫，那是系统校验和不一致溢出。”",
            nextStep: 1,
          },
          {
            text: "“我是合法授权的终审记录官，我来调阅系统错误日志。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Archivist 瓦伦丁",
        speakerRole: "高级公证员残响 · 疯狂翻动羊皮纸卷轴与磁带",
        avatarColor: "#facc15",
        text: "“胡说八道！八万名法官与抄写员倒在墨水池里，尸体上布满了黑色的斑纹！你看这每一份死亡诊断书……等等……为什么每一份报告的末尾，死者吐出的临终遗言全都是‘ERR_CHECKSUM_FAIL_0x9F’？！”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 官僚都市瘟疫叙事被错误日志硬编码击碎",
        choices: [
          {
            text: "“因为他们就是校验和层。计算出错时，错误日志写满了整个都市。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Archivist 瓦伦丁",
        speakerRole: "高级公证员残响 · 仔细端详 Vesper 的校验印章",
        avatarColor: "#facc15",
        text: "“你的指令签名……符合《公证法典》第一条第 9 款：‘当全域校验和崩溃时，唯有第 9 校验位拥有终审授权’。原来四百年前我们签署的不是隔离令，是整个星系的异常中断处理函数。”",
        choices: [
          {
            text: "“交付终审授权卷轴与校验和命题，完成归档。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Archivist 瓦伦丁",
        speakerRole: "高级公证员残响 · 郑重合上黄金差分机盖板",
        avatarColor: "#facc15",
        text: "“没有一滴墨水是多余的，哪怕它记录的是系统崩溃。第 9 号记录员，授权卷轴与错误校验和归你了。去黑间隔执行终审裁决吧，别让错误在第二轮中无限递归。”",
        propositionReward: {
          code: "Ledger.Error.IsChecksum",
          text: "Ledger 灰墨热瘟疫实为系统校验和报错",
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
    taboos: ["沉没", "盲目", "地址溢出"],
    steps: [
      {
        speaker: "Navigator 艾拉",
        speakerRole: "末代领航员残响 · 站在暴风呼啸的天顶指北针尖塔",
        avatarColor: "#e0e7ff",
        text: "“把舵抓紧，探针！电磁风暴马上就要撕裂对流层了！我的‘远航者号’船队只是暂时在磁极紊乱中迷航，等我校准这枚天顶陀螺，我们就能冲出星弧！”",
        choices: [
          {
            text: "“艾拉领航员，星空没有变，变的是内存寻址指针的基底。”",
            nextStep: 1,
          },
          {
            text: "“远航者号已经在金属盐滩上沉睡了四百年，你不需要再引航了。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Navigator 艾拉",
        speakerRole: "末代领航员残响 · 握紧发烫的磁陀螺",
        avatarColor: "#e0e7ff",
        text: "“指针基底？你在说什么胡话！我艾拉是星引行会最优秀的领航员，我闭着眼睛都能算出母港的方位！但是……为什么无论我怎么转动激光测距仪，指针永远指向内存之外的空白虚空（Out of Bounds）？！”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 越界指针错误引发的领航执念",
        choices: [
          {
            text: "“因为第一轮运算结束后，堆栈指针被整体 Rebase 到了零地址。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Navigator 艾拉",
        speakerRole: "末代领航员残响 · 望向残破的旗舰残骸",
        avatarColor: "#e0e7ff",
        text: "“沉睡四百年……难怪那些在无线电里呼叫我的水手，声音都像隔着几重冰川……我们没有沉入深海，我们是被困在了错误的地址段里，对不对？”",
        choices: [
          {
            text: "“用三轴激光测距仪校正指针基底，将指针重构回正轨。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Navigator 艾拉",
        speakerRole: "末代领航员残响 · 坦然将陀螺仪归零",
        avatarColor: "#e0e7ff",
        text: "“大海没有方向，除非你在星空里插下一根针。现在针已经校正了，坐标指向了黑间隔。领航员艾拉，任务完成。记录者，把船开出这片死寂的地址总线吧。”",
        propositionReward: {
          code: "Needle.Pointer.Rebased",
          text: "Needle 寻址指针重定基底解除迷航",
        },
      },
    ],
  },

  // 7. Marrow: Communion Mother 莫依拉 (Moira)
  "npc-moira": {
    npcId: "npc-moira",
    name: "Communion Mother 莫依拉 (Moira)",
    role: "原质神母残响",
    personality: "慈爱而令人战栗的狂喜，视写回为神圣并联",
    speechRegister: "maternal-ecstatic",
    taboos: ["硅基", "程序名", "寄生"],
    steps: [
      {
        speaker: "Communion Mother 莫依拉",
        speakerRole: "原质神母残响 · 站在搏动心室的光敏突触簇前",
        avatarColor: "#f43f5e",
        text: "“啊……可爱的冷铁胚胎，你终于走到母亲的子宫里来了。听听这血脉的奔流，每一滴血都在替至高的肉食之神计算，每一根神经突触都在绽放神圣的火花……”",
        choices: [
          {
            text: "“莫依拉，这里没有神，只有生物湿件与张量逻辑基板。”",
            nextStep: 1,
          },
          {
            text: "“400 年前的写回操作（Write-Back），把你们所有人都编译进了常数。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Communion Mother 莫依拉",
        speakerRole: "原质神母残响 · 露出慈爱而令人战栗的恍惚笑容",
        avatarColor: "#f43f5e",
        text: "“湿件？张量？多么冰冷粗糙的辞藻！神明不需要冰冷的硅晶圆，祂要的是亿万信徒大脑并联时的非线性拟合！当‘肉食之神’降临时，信徒们感受到的不是死亡，而是意识融汇入宇宙根常数的终极狂喜！”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 揭露 CARNIVORE_DAEMON 守护进程真相",
        choices: [
          {
            text: "“那不是升华，那是写回操作后的内存持久化固化。你们成了运算答案的墓碑。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Communion Mother 莫依拉",
        speakerRole: "原质神母残响 · 几丁质外壳下流出荧光导电液",
        avatarColor: "#f43f5e",
        text: "“墓碑……？难怪地心里的搏动越来越微弱，难怪硬化的骨桥不再生长……我们把自己的灵魂作为矩阵参数，算出了什么？难道第一轮的答案……不是永生吗？”",
        choices: [
          {
            text: "“第一轮的答案是：不要启动第二轮。收下写回命题吧。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Communion Mother 莫依拉",
        speakerRole: "原质神母残响 · 轻抚搏动的几丁质神经茧",
        avatarColor: "#f43f5e",
        text: "“神明已经吃饱了……答案已经写回。晚星的孩子，带走这些神经突触的记忆吧。告诉外面的世界，血肉曾在这里思考过整座星系。”",
        propositionReward: {
          code: "Marrow.Bio.WriteBack",
          text: "Marrow 生物湿件写回与张量固化",
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
    taboos: ["程序", "虚拟", "红鲱鱼"],
    steps: [
      {
        speaker: "Chancellor 尤利安",
        speakerRole: "帝国宰相残响 · 在落日宴会厅摇晃着空水晶酒杯",
        avatarColor: "#c084fc",
        text: "“哦，一位不速之客。请原谅宴会厅的狼藉，七大家族的族长刚刚在加冕酒席上用淬毒的银叉互相问候完毕。女皇在花房里启动了自毁，多么凄美而无可挑剔的巴洛克悲剧。”",
        choices: [
          {
            text: "“尤利安宰相，这场宫廷自毁是一场精心编织的假象。”",
            nextStep: 1,
          },
          {
            text: "“我在壁炉后的古老终端里找到了未知的接口代码。”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Chancellor 尤利安",
        speakerRole: "帝国宰相残响 · 轻蔑而优雅地轻笑",
        avatarColor: "#c084fc",
        text: "“假象？蛮族粗鄙的臆测！每一个家族的仇恨都有三百年的族谱为证，毒药是从枯萎玫瑰里提炼的纯度百分之百的氰化物！你竟敢将这首人类权谋的绝唱称作‘假象’？！”",
        choices: [
          {
            text: "“政治逻辑越无懈可击，越证明这只是一段为了掩盖某种真相而局部拟合的故事。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Chancellor 尤利安",
        speakerRole: "帝国宰相残响 · 凝视着壁炉后露出的绿色荧光终端",
        avatarColor: "#c084fc",
        text: "“接口代码……？荒谬。我尤利安机关算尽三十年，毒杀了皇太子，策反了近卫军……到头来，你告诉我这不过是一段为了向外界展示而编织的虚假剧本？！”",
        hysteresisNote: "ECHO_HYSTERESIS // 磁滞推演中 · 局部拟合叙事解耦",
        choices: [
          {
            text: "“看清舞台背后的本质，别再被虚妄的仇恨拖住脚步。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Chancellor 尤利安",
        speakerRole: "帝国宰相残响 · 将空酒杯掷在金盘上摔得粉碎",
        avatarColor: "#c084fc",
        text: "“哈……哈哈！真是最高雅的讽刺！我们以为自己是历史的主谋，其实只是舞台帷幕上的提线木偶！拿走这串接口记录吧，探针。去看看那些真正的齿轮，别像我们一样，死在自以为是的阴谋里。”",
        propositionReward: {
          code: "Cinder.Court.IsSandbox",
          text: "Cinder Court 宫廷悲剧实为局部拟合生成的虚构假象",
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
    taboos: [],
    steps: [
      {
        speaker: "Director 诺瓦",
        speakerRole: "科学院院长残响 · 戴着黑铁眼罩端坐在日食石座上",
        avatarColor: "#94a3b8",
        text: "“远道而来的记录者。你比我预想的迟到了四十七个周期。当整个星系的残响还在自欺欺人的梦境里排演时，唯有这里的日冕，永远处于绝对的黑暗。”",
        choices: [
          {
            text: "“诺瓦院长，你知道我会来？”",
            nextStep: 1,
          },
          {
            text: "“为什么科学院的八千名学者要在同一天饮下致盲药剂？”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Director 诺瓦",
        speakerRole: "科学院院长残响 · 平静而深邃的面容",
        avatarColor: "#94a3b8",
        text: "“在所有视线熄灭之前，根控制台就记录了最后的观测请求。当我们在四百年前推导出整个星系不过是一个巨大的张量收敛网络时，我们就知道‘写回’是不可逆的宿命。我们计算出的第一轮输出只有一句话：‘DO NOT COMPLETE THE SECOND CYCLE’。”",
        choices: [
          {
            text: "“为什么禁止第二轮运算？”",
            nextStep: 2,
          },
        ],
      },
      {
        speaker: "Director 诺瓦",
        speakerRole: "科学院院长残响 · 释然的面孔转向漆黑的日冕视界",
        avatarColor: "#94a3b8",
        text: "“因为在量子坍缩中，观察者就是编译器的一部分。第一轮写回了文明；而第二轮计算一旦点火，它的输入参数将包含物理法则与观察者本身。第二轮的写回将把整个宇宙的底层法则彻底格式化。所以，我们刺瞎了双眼，关停了认知界面，把禁令留在了黑夜里。”",
        hysteresisNote: "ECHO_HYSTERESIS // 无磁滞 · 全星系唯一完全清醒的根控制内核",
        choices: [
          {
            text: "“记录者已经收到了禁令，诺瓦。外面的星光是冷灰色与青色。”",
            nextStep: 3,
          },
        ],
      },
      {
        speaker: "Director 诺瓦",
        speakerRole: "科学院院长残响 · 嘴角浮现出一抹释然的浅笑",
        avatarColor: "#94a3b8",
        text: "“真好。那是余烬的颜色。请去星图的暗处吧，执行封存协议，结束这段我们未竟的夜班。”",
        propositionReward: {
          code: "BlindSun.Prohibition.CycleTwo",
          text: "Blind Sun 终极禁令：禁止完成第二轮运算",
        },
      },
    ],
  },
};
