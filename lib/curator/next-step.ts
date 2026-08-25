import { CANON } from "@/lib/canon";
import { deriveTruthStates, type TruthStatus } from "@/lib/storage/stores";
import { salienceForPlayerState } from "./salience";

export interface NextStepHint {
  id: string;
  planetId?: string;
  planetLabel: string;
  siteLabel?: string;
  text: string;
  priority: number; // 3: suspected (ready for INDEX), 2: encountered, 1: unlocked unknown, 0: empty/idle
  status: TruthStatus | "ending" | "idle";
  actionType: "index" | "explore" | "dialogue" | "resolution";
}

/**
 * Surface-layer Forbidden Lexicon from Dual-Layer Style Bible (§2 & §3).
 * Used for automated regression verification in tests.
 */
export const GLOBAL_FORBIDDEN_WORDS: readonly string[] = Object.freeze([
  "引导扇区",
  "握手载波",
  "总线",
  "ROM",
  "压电晶振",
  "时钟基频",
  "寻址",
  "堆栈指针",
  "张量",
  "生物湿件",
  "写回",
  "写回操作",
  "常数化",
  "常数",
  "熔断",
  "校验位",
  "沙盒",
  "代码",
  "程序",
  "Hypervisor"
]);

export const PLANET_FORBIDDEN_WORDS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "helix-7": ["引导扇区", "握手载波", "Bootstrap", "BIOS", "冷启动代码"],
  "kiln": ["能量总线", "双向互斥阀", "多态继电器", "Mutex", "电源分配", "死锁"],
  "glass-orchard": ["只读光存", "ROM", "写保护", "耗尽读取", "晶格存储矩阵"],
  "choir-well": ["中央时钟", "压电晶振", "基频时钟", "Clock", "时序相位"],
  "ledger": ["系统错误日志", "校验和", "Checksum", "异常中断", "崩溃转储"],
  "needle": ["内存寻址", "堆栈指针", "Stack Pointer", "地址越界", "重定基底"],
  "marrow": ["生物湿件", "张量处理单元", "TPU", "写回", "写回操作", "Write-Back", "后台守护进程"],
  "cinder-court": ["沙盒终端", "局部拟合", "红鲱鱼", "虚拟环境", "测试用例"],
  "blind-sun": ["根控制台", "Hypervisor", "只读内核", "第二轮输入向量"],
  "black-interval": ["奇偶校验插座", "Parity Bit", "第九校验位", "固件重刷"]
});

/**
 * Deterministic Fiction-Interior Protocol Table.
 * Surface layer human observations only. No LLM invocation. No canon leakage.
 */
export const NEXT_STEP_PROTOCOL_TABLE = Object.freeze({
  T1: {
    suspected: {
      planetLabel: "螺旋-7",
      siteLabel: "公证索引台",
      text: "冷启台地与偶极天线的观测已对齐——前往公证索引台建立因果综合",
      actionType: "index" as const
    },
    encountered_missing_antenna: {
      planetLabel: "螺旋-7",
      siteLabel: "偶极天线阵列",
      text: "塔基提到未标记信号——偶极天线阵列或许有答案",
      actionType: "explore" as const
    },
    encountered_missing_beacon: {
      planetLabel: "螺旋-7",
      siteLabel: "冷启台地",
      text: "偶极天线捕获到未知谐波——返回冷启台地核对信标记录",
      actionType: "explore" as const
    },
    unlocked_initial: {
      planetLabel: "螺旋-7",
      siteLabel: "冷启台地",
      text: "降落冷启台地——向测绘员塔基打探信标持续广播的缘由",
      actionType: "dialogue" as const
    }
  },
  T2: {
    suspected: {
      planetLabel: "窑 / 果园",
      siteLabel: "公证索引台",
      text: "锻炉总管与晶林大旱的观测已交汇——前往公证索引台建立因果综合",
      actionType: "index" as const
    },
    encountered_missing_orchard: {
      planetLabel: "玻璃果园",
      siteLabel: "深坑读头",
      text: "断裂总管的阀门记录已获取——前往玻璃果园深坑物镜调查光旱成因",
      actionType: "explore" as const
    },
    encountered_missing_kiln: {
      planetLabel: "窑",
      siteLabel: "断裂总管",
      text: "深坑巨型物镜的读数已就绪——前往窑星断裂总管调查供热阻断阀门",
      actionType: "explore" as const
    },
    unlocked_kiln: {
      planetLabel: "窑",
      siteLabel: "断裂总管",
      text: "第一锻炉火光未熄——前往断裂总管调查阻断地热铜管的阀门",
      actionType: "explore" as const
    },
    unlocked_orchard: {
      planetLabel: "玻璃果园",
      siteLabel: "深坑读头",
      text: "晶体森林静滞无声——前往折射林冠与深坑读头探寻大旱之谜",
      actionType: "explore" as const
    }
  },
  T3: {
    suspected: {
      planetLabel: "咏井 / 针",
      siteLabel: "公证索引台",
      text: "大教堂定频管风琴与天顶激光测距的记录已对齐——前往公证索引台建立因果综合",
      actionType: "index" as const
    },
    encountered_missing_needle: {
      planetLabel: "针",
      siteLabel: "天顶指北针",
      text: "深海管风琴的恒定音高已记录——前往针星天顶调查激光测距仪",
      actionType: "explore" as const
    },
    encountered_missing_choir: {
      planetLabel: "咏井",
      siteLabel: "浸水大教堂",
      text: "天顶测距仪的偏转数据已就绪——前往咏井大教堂勘测钛合金管风琴",
      actionType: "explore" as const
    },
    unlocked_choir: {
      planetLabel: "咏井",
      siteLabel: "浸水大教堂",
      text: "深海大教堂回荡不绝——下潜浸水大教堂调查永恒圣歌的源头",
      actionType: "explore" as const
    },
    unlocked_needle: {
      planetLabel: "针",
      siteLabel: "天顶指北针",
      text: "星引行会罗盘失准——登上天顶指北针向领航员艾拉了解航标",
      actionType: "dialogue" as const
    }
  },
  T4: {
    suspected: {
      planetLabel: "髓",
      siteLabel: "公证索引台",
      text: "光敏突触簇与硬化几丁质基板的线索已齐备——前往公证索引台建立因果综合",
      actionType: "index" as const
    },
    encountered_missing_matrix: {
      planetLabel: "髓",
      siteLabel: "搏动心室",
      text: "突触神经的异动已记录——在搏动心室进一步调查硬化几丁质基板",
      actionType: "explore" as const
    },
    encountered_missing_nerve: {
      planetLabel: "髓",
      siteLabel: "搏动心室",
      text: "几丁质基板纹路已记录——在搏动心室勘测光敏神经突触簇",
      actionType: "explore" as const
    },
    unlocked_initial: {
      planetLabel: "髓",
      siteLabel: "搏动心室",
      text: "原质神教血肉并联——深入搏动心室打探肉食之神降临的遗迹",
      actionType: "dialogue" as const
    }
  },
  T5: {
    suspected: {
      planetLabel: "总账",
      siteLabel: "公证索引台",
      text: "机械差分机与终审授权卷轴已核验——前往公证索引台建立因果综合",
      actionType: "index" as const
    },
    encountered_missing_vault: {
      planetLabel: "总账",
      siteLabel: "公证中枢",
      text: "差分机记录已获取——在公证中枢查阅终审授权卷轴",
      actionType: "explore" as const
    },
    encountered_missing_diff: {
      planetLabel: "总账",
      siteLabel: "公证中枢",
      text: "公证授权卷轴已阅览——在公证中枢检视机械差分机",
      actionType: "explore" as const
    },
    unlocked_initial: {
      planetLabel: "总账",
      siteLabel: "公证中枢",
      text: "哥特公证署封印依旧——前往公证中枢向瓦伦丁查阅灰墨大疫档案",
      actionType: "dialogue" as const
    }
  },
  THidden: {
    suspected: {
      planetLabel: "黑间隔",
      siteLabel: "公证索引台",
      text: "记录仪底座与晚星记忆残片已共鸣——前往公证索引台揭开最终因果",
      actionType: "index" as const
    },
    encountered_core_only: {
      planetLabel: "黑间隔",
      siteLabel: "终极综合台",
      text: "底座记录已确认——在终极综合台继续探寻晚星记忆核心",
      actionType: "explore" as const
    },
    encountered_memory_only: {
      planetLabel: "黑间隔",
      siteLabel: "终极综合台",
      text: "记忆核心已就绪——在终极综合台检视余烬记录仪底座",
      actionType: "explore" as const
    },
    unlocked_initial: {
      planetLabel: "黑间隔",
      siteLabel: "终极综合台",
      text: "虚空断崖已显现——前往终极综合台探寻余烬记录仪的源起",
      actionType: "explore" as const
    }
  },
  ending: {
    ready: {
      planetLabel: "全域终局",
      siteLabel: "舰载总控室",
      text: "全星弧因果链已全部锚定——前往舰载总控室执行全域终局决议协议",
      actionType: "resolution" as const
    }
  },
  idle: {
    empty: {
      planetLabel: "星图巡航",
      siteLabel: "舰桥",
      text: "当前星域无待解悬念——可查阅公证索引台或巡航各星系",
      actionType: "explore" as const
    }
  }
});

/**
 * Derive deterministic, fiction-interior next-step hints from player progress.
 *
 * Parallel Rule (窑/果园并列):
 * When multiple truths or companion planets can be advanced concurrently,
 * returns multiple distinct hints so the UI can render them side-by-side without forcing a choice.
 */
export function deriveNextStepHints(
  collectedPropositions: readonly string[],
  believedTruths: readonly string[]
): NextStepHint[] {
  // 1. All anchor truths believed -> Full canon resolution ready
  if (
    CANON.anchorTruths.length > 0 &&
    CANON.anchorTruths.every((t) => believedTruths.includes(t.id))
  ) {
    const endCfg = NEXT_STEP_PROTOCOL_TABLE.ending.ready;
    return [
      {
        id: "ending-ready",
        planetLabel: endCfg.planetLabel,
        siteLabel: endCfg.siteLabel,
        text: endCfg.text,
        priority: 4,
        status: "ending",
        actionType: endCfg.actionType
      }
    ];
  }

  const truthStates = deriveTruthStates(collectedPropositions, believedTruths);
  const propSet = new Set(collectedPropositions);

  // 2. High priority (3): Suspected truths (all propositions gathered, ready for INDEX synthesis)
  const suspectedHints: NextStepHint[] = [];
  for (const truth of CANON.anchorTruths) {
    if (truthStates[truth.id] === "suspected") {
      const cfg = (NEXT_STEP_PROTOCOL_TABLE as any)[truth.id]?.suspected;
      if (cfg) {
        suspectedHints.push({
          id: `${truth.id}-suspected`,
          planetId: truth.primary_planet,
          planetLabel: cfg.planetLabel,
          siteLabel: cfg.siteLabel,
          text: cfg.text,
          priority: 3,
          status: "suspected",
          actionType: cfg.actionType
        });
      }
    }
  }
  if (suspectedHints.length > 0) {
    return suspectedHints;
  }

  // 3. Medium priority (2): Encountered truths (partially collected, missing 1 proposition)
  const encounteredHints: NextStepHint[] = [];
  for (const truth of CANON.anchorTruths) {
    if (truthStates[truth.id] === "encountered") {
      if (truth.id === "T1") {
        const hasBeacon = propSet.has("Helix.Beacon.Broadcasting");
        const cfg = hasBeacon
          ? NEXT_STEP_PROTOCOL_TABLE.T1.encountered_missing_antenna
          : NEXT_STEP_PROTOCOL_TABLE.T1.encountered_missing_beacon;
        encounteredHints.push({
          id: "T1-encountered",
          planetId: "helix-7",
          planetLabel: cfg.planetLabel,
          siteLabel: cfg.siteLabel,
          text: cfg.text,
          priority: 2,
          status: "encountered",
          actionType: cfg.actionType
        });
      } else if (truth.id === "T2") {
        const hasKiln = propSet.has("Kiln.Bus.Mutex");
        const cfg = hasKiln
          ? NEXT_STEP_PROTOCOL_TABLE.T2.encountered_missing_orchard
          : NEXT_STEP_PROTOCOL_TABLE.T2.encountered_missing_kiln;
        encounteredHints.push({
          id: "T2-encountered",
          planetId: hasKiln ? "glass-orchard" : "kiln",
          planetLabel: cfg.planetLabel,
          siteLabel: cfg.siteLabel,
          text: cfg.text,
          priority: 2,
          status: "encountered",
          actionType: cfg.actionType
        });
      } else if (truth.id === "T3") {
        const hasChoir = propSet.has("Choir.Hymn.IsClock");
        const cfg = hasChoir
          ? NEXT_STEP_PROTOCOL_TABLE.T3.encountered_missing_needle
          : NEXT_STEP_PROTOCOL_TABLE.T3.encountered_missing_choir;
        encounteredHints.push({
          id: "T3-encountered",
          planetId: hasChoir ? "needle" : "choir-well",
          planetLabel: cfg.planetLabel,
          siteLabel: cfg.siteLabel,
          text: cfg.text,
          priority: 2,
          status: "encountered",
          actionType: cfg.actionType
        });
      } else if (truth.id === "T4") {
        const hasNerve = propSet.has("Marrow.God.IsProcess");
        const cfg = hasNerve
          ? NEXT_STEP_PROTOCOL_TABLE.T4.encountered_missing_matrix
          : NEXT_STEP_PROTOCOL_TABLE.T4.encountered_missing_nerve;
        encounteredHints.push({
          id: "T4-encountered",
          planetId: "marrow",
          planetLabel: cfg.planetLabel,
          siteLabel: cfg.siteLabel,
          text: cfg.text,
          priority: 2,
          status: "encountered",
          actionType: cfg.actionType
        });
      } else if (truth.id === "T5") {
        const hasDiff = propSet.has("Ledger.Error.IsChecksum");
        const cfg = hasDiff
          ? NEXT_STEP_PROTOCOL_TABLE.T5.encountered_missing_vault
          : NEXT_STEP_PROTOCOL_TABLE.T5.encountered_missing_diff;
        encounteredHints.push({
          id: "T5-encountered",
          planetId: "ledger",
          planetLabel: cfg.planetLabel,
          siteLabel: cfg.siteLabel,
          text: cfg.text,
          priority: 2,
          status: "encountered",
          actionType: cfg.actionType
        });
      } else if (truth.id === "THidden") {
        const hasCore = propSet.has("Interval.Core.Recorder9");
        const cfg = hasCore
          ? NEXT_STEP_PROTOCOL_TABLE.THidden.encountered_core_only
          : NEXT_STEP_PROTOCOL_TABLE.THidden.encountered_memory_only;
        encounteredHints.push({
          id: "THidden-encountered",
          planetId: "black-interval",
          planetLabel: cfg.planetLabel,
          siteLabel: cfg.siteLabel,
          text: cfg.text,
          priority: 2,
          status: "encountered",
          actionType: cfg.actionType
        });
      }
    }
  }
  if (encounteredHints.length > 0) {
    return encounteredHints;
  }

  // 4. Exploratory / Unlocked unknown paths (Priority 1)
  // Stage 1: T1 unknown (Initial game start at Helix-7)
  if (!believedTruths.includes("T1")) {
    const cfg = NEXT_STEP_PROTOCOL_TABLE.T1.unlocked_initial;
    return [
      {
        id: "T1-unlocked",
        planetId: "helix-7",
        planetLabel: cfg.planetLabel,
        siteLabel: cfg.siteLabel,
        text: cfg.text,
        priority: 1,
        status: "unknown",
        actionType: cfg.actionType
      }
    ];
  }

  // Stage 2: T1 believed -> T2 unlocked (窑 / 果园 并列两句)
  if (!believedTruths.includes("T2")) {
    const cfgKiln = NEXT_STEP_PROTOCOL_TABLE.T2.unlocked_kiln;
    const cfgOrchard = NEXT_STEP_PROTOCOL_TABLE.T2.unlocked_orchard;
    return [
      {
        id: "T2-unlocked-kiln",
        planetId: "kiln",
        planetLabel: cfgKiln.planetLabel,
        siteLabel: cfgKiln.siteLabel,
        text: cfgKiln.text,
        priority: 1,
        status: "unknown",
        actionType: cfgKiln.actionType
      },
      {
        id: "T2-unlocked-orchard",
        planetId: "glass-orchard",
        planetLabel: cfgOrchard.planetLabel,
        siteLabel: cfgOrchard.siteLabel,
        text: cfgOrchard.text,
        priority: 1,
        status: "unknown",
        actionType: cfgOrchard.actionType
      }
    ];
  }

  // Stage 3: T2 believed -> T3 unlocked (咏井 / 针 并列两句)
  if (!believedTruths.includes("T3")) {
    const cfgChoir = NEXT_STEP_PROTOCOL_TABLE.T3.unlocked_choir;
    const cfgNeedle = NEXT_STEP_PROTOCOL_TABLE.T3.unlocked_needle;
    return [
      {
        id: "T3-unlocked-choir",
        planetId: "choir-well",
        planetLabel: cfgChoir.planetLabel,
        siteLabel: cfgChoir.siteLabel,
        text: cfgChoir.text,
        priority: 1,
        status: "unknown",
        actionType: cfgChoir.actionType
      },
      {
        id: "T3-unlocked-needle",
        planetId: "needle",
        planetLabel: cfgNeedle.planetLabel,
        siteLabel: cfgNeedle.siteLabel,
        text: cfgNeedle.text,
        priority: 1,
        status: "unknown",
        actionType: cfgNeedle.actionType
      }
    ];
  }

  // Stage 4: T3 believed -> T4 (Marrow) and T5 (Ledger) both unlocked
  const parallelUnlocked: NextStepHint[] = [];
  if (!believedTruths.includes("T4")) {
    const cfgT4 = NEXT_STEP_PROTOCOL_TABLE.T4.unlocked_initial;
    parallelUnlocked.push({
      id: "T4-unlocked",
      planetId: "marrow",
      planetLabel: cfgT4.planetLabel,
      siteLabel: cfgT4.siteLabel,
      text: cfgT4.text,
      priority: 1,
      status: "unknown",
      actionType: cfgT4.actionType
    });
  }
  if (!believedTruths.includes("T5")) {
    const cfgT5 = NEXT_STEP_PROTOCOL_TABLE.T5.unlocked_initial;
    parallelUnlocked.push({
      id: "T5-unlocked",
      planetId: "ledger",
      planetLabel: cfgT5.planetLabel,
      siteLabel: cfgT5.siteLabel,
      text: cfgT5.text,
      priority: 1,
      status: "unknown",
      actionType: cfgT5.actionType
    });
  }
  if (parallelUnlocked.length > 0) {
    return parallelUnlocked;
  }

  // Stage 5: T5 believed -> THidden unlocked
  if (!believedTruths.includes("THidden")) {
    const cfgTHidden = NEXT_STEP_PROTOCOL_TABLE.THidden.unlocked_initial;
    return [
      {
        id: "THidden-unlocked",
        planetId: "black-interval",
        planetLabel: cfgTHidden.planetLabel,
        siteLabel: cfgTHidden.siteLabel,
        text: cfgTHidden.text,
        priority: 1,
        status: "unknown",
        actionType: cfgTHidden.actionType
      }
    ];
  }

  // 5. Empty State (空态)
  const emptyCfg = NEXT_STEP_PROTOCOL_TABLE.idle.empty;
  return [
    {
      id: "idle-empty",
      planetLabel: emptyCfg.planetLabel,
      siteLabel: emptyCfg.siteLabel,
      text: emptyCfg.text,
      priority: 0,
      status: "idle",
      actionType: emptyCfg.actionType
    }
  ];
}
