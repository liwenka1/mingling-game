# 明陵游艺

以北京昌平明十三陵为取材对象的三款网页解谜游戏。

- **神道石影**　借同一个空位挪动石兽，排回总神道的顺序。
- **斗拱承檐**　用有限的支座分配屋檐重量，让立柱在承重上限内通过试压。
- **一线盘金**　用有限长度的金丝绕开珠位，依次穿过两枚金环。

每款游戏都从入门题开始，可直接切换关卡。切换游戏标签时会保留当前进度。通关后有一张与实物或现场有关的观察卡。

## 本地运行

使用 Node.js 22.12 或更新的受支持版本。

```sh
npm ci
npm run dev
```

## 生产构建

```sh
npm run build
npm run preview
```

构建产物在 `dist/`。在 Vercel 导入此仓库时，可使用 Vite 预设，构建命令为 `npm run build`，输出目录为 `dist`。游戏在浏览器内运行，素材随项目一同部署。

## 代码与资料

- `src/App.tsx` 管理游戏切换和各游戏的玩法说明。
- `src/games/` 包含三个游戏组件、关卡规则和求解逻辑。木构和走线在第一次进入对应标签时加载。
- `src/assets/` 包含场景和石兽的 WebP 插画。插画使用 OpenAI 图像生成。

游戏的周转位、承重数值和走线路径是玩法设定。实物资料可在游戏内的「史料与美术」打开。

- [故宫博物院 · 明长陵](https://www.dpm.org.cn/court/system/236400.html)
- [明十三陵景区 · 神路石象](https://www.mingshisanling.com/spot/98.html)
- [明十三陵景区 · 长陵祾恩殿](https://www.mingshisanling.com/spot/100.html)
- [中国国家博物馆 · 孝端皇后九龙九凤冠](https://www.chnmuseum.cn/zx/gbxw/202603/t20260306_278223.shtml)
