---
title: "【参加レポート】Go Conference 2025"
date: 2025-09-29T22:50:50+09:00
draft: false
description: "Go Conference 2025の参加レポート"
tags: ["参加レポート", "Go"]
ail: 1
---

## 概要

[Go Conference 2025](https://gocon.jp/2025/)

2025年9月27日と28日の2日間開催。
昨年行きたいと思った時には既にチケットは完売、今年が初参加。

両日参加したかったものの、27日は都合が合わず28日のみの感想となる。
また夕方も都合があり17時頃までの参加となった。

聴講したセッションおよびスポンサーブースでの感想を記載する。

なお、Go言語の経験は約3年程度。
業務ではバックエンドでゴリゴリAPIを書くよりかはミドル寄りの人間であり、
OSSとして公開されている[AILERON Gateway](https://github.com/aileron-gateway/aileron-gateway)での開発が主。
興味があれば覗いてみて欲しい。

----

## セッション

### [1. Go1.25新機能 testing/synctest で高速 & 確実な並列テストを実現する方法](https://docs.google.com/presentation/d/1nCysE_J4WpRUwvDQSAzZbtFFCgCWAZL1tayBVfh79iQ/edit?slide=id.p1#slide=id.p1)

[Panaさん](https://x.com/pana_333)による2日目最初のセッション。

個人的にGo 1.25のリリースノートを眺めていた時に気になっていたsynctestに焦点を当てたセッション。同期的なテストと非同期的なテストの違いからの問題提起が非常に分かりやすく自然とセッションの理解が進んだ。

ただ、セッション中に頻出した単語である"durably blocked"がよく分かっていなかったため、このタイミングで調べる。すると、1日目に発表された[Daiki Kuboさん](https://x.com/pythonism_)の「[deep dive into testing/synctest](https://speakerdeck.com/daikieng/synctest)」がヒットした。

引用させていただくと、

> bubble外のイベントでは解除されないブロック状態
> 例えば、
> - time.Sleep
> - bubble内のchannelに対してのsend/receive
> - selectのケースがbubble内のchannel
> - sync.Cond.wait
> など・・・

> Durably Blockedではないもの:
> - bubble外のイベントやゴルーチンによって解除されうるもの

> これによって何が起きるか:
> - 仮想時間が進まず
> - bubbleがidleとみなされずWaitは永遠にブロックされる

分かったような分からないような……。
[GoDoc](https://pkg.go.dev/testing/synctest#hdr-Blocking)を見に行く。

が、定義なので同じことが書いてある。それはそう。
time.Sleepを筆頭に詰みの状態(durably blocked)になったらbubbleの時刻が進むという話なのだろうな。
その上でsynctest.Waitはgoroutineの終了ではなくdurably blockedになることを待っている作り。

Panaさんのセッションに戻ると、この内容を40分のセッションに詰め込んで解説されているのが凄すぎる。
自分で使うとなるとgoroutineを正確に把握したうえで実装する必要があるので、実装時もレビュー時も中々大変そうに思えてしまった。
その分、並行テストを高速かつ安定して実施するポテンシャルを秘めているので使いこなせると良いなと感じた。

----

### 2. Goに育てられ開発者向けセキュリティ事業を立ち上げた僕が今向き合う、AI × セキュリティの最前線

[Koki Ideさん](https://x.com/niconegoto)によるスポンサーセッション。
GMO Flatt SecurityのCEOによる発表であり、セキュリティ診断AIエージェント Takumiを中心とした紹介。

あまり個人でClaude CodeはじめAIエージェントに脆弱性を見つけさせるような使い方はしないものの、
Claude Codeの誤検知率と比較した際のTakumiの誤検知率の低さは目を惹いた。機会があれば利用したい。

----

### [3. Goで体感するMultipath TCP ― Go 1.24 時代の MPTCP Listener を理解する](https://speakerdeck.com/takehaya/go-conference-2025-godeti-gan-surumultipath-tcp-go-1-dot-24-shi-dai-no-mptcp-listener-woli-jie-suru)

[Takeru Hayasakaさん](https://x.com/takemioIO)によるセッション。

普段ネットワーク屋さんをしていないこともあり、恥ずかしながらMultipath TCP自体初めて知った。
アプリ側は従来通りのTCPの使い勝手のまま、複数のTCPコネクションをsubflowと呼ばれる単位で束ねる仕組みのこと。
仕組みとしては十分に理解可能かつ、従来のTCPコネクションを拡張した仕組みであることから、
SYN, SYN+ACK, ACKのフロー上に拡張してやり取りしているのは納得がいくとともに面白い。

Goで利用する際にも基本的にはデフォルトで良いのも意識することが少なくて良い作りだと感じた。
普段あまり意識しないレイヤーの話で楽しかった。

----

### [4. Go1.24時代のユニットテスト品質向上](https://speakerdeck.com/shotarowatanabe6/go1-dot-24shi-dai-no-yunitutotesutopin-zhi-xiang-shang)

[Shotaro Watanabeさん](https://x.com/5wee7)によるセッション。

1.24で導入されたtesting.T.Context()を利用するとdefer忘れが無くなることでgoroutine leakが防げるようになったことと、
uber-go/mockを利用することでDBを含めたテストでもモックによって、信頼可能なテストが書けるようになったという話であった。
過去、go-redisを利用してredisのunit testを書いたことを思い出しながら聞いていた。

また本セッションではAtS (Ask the Speaker)で会話させていただいた。
リリースを最優先していることでテストを書くことが後回しになった結果、
誰かが書いたコードの単体テストを書かざるを得ない状況になっていたとのこと。

この辺りの文化の醸造は組織や人によっても状況が異なるので難しいと思いつつも、
やっぱりテスト無いと難しくない……？という話になった。

2日目しか参加していないものの、このくらいのレベル感のセッションがもう少しあっても良かったように感じた。

----

### [5. Goのビルドシステムの変遷](https://speakerdeck.com/ymotongpoo/the-history-of-gos-build-system)

[ymotongpooさん](https://x.com/ymotongpoo)によるGo昔話なセッション。

Goに触れた時にはgo modだったので過去の話を知ることが出来た貴重な機会であった。
Go 1からも色々と紆余曲折あったり、Go開発チームの強気の姿勢だったりと面白い箇所が幾つもあった。

20分のShort Sessionに収めるにはあまりにも濃いセッションであったので、
省かれてしまった歴史に関してはまたどこかで知りたい。

楽しみ。

{{< x user="ymotongpoo" id="1972205607798428002" >}}

----

### [6. 0→1製品の毎週リリースを支えるGoパッケージ戦略——AI時代のPackage by Feature実践](https://speakerdeck.com/optim/20250928-goconference2025-uehara)

OPTiM 上原さんによるスポンサーセッション。

Package by LayerとPackage by Featureの両方を比較し、それぞれのメリデメ比較をされていた。
どちらのPackage構成も良い部分があり、規模や目的に応じて最適解を模索するのが良さそう。
Contextの関係上、Package by Featureの方がAIとの親和性が高い点は今時の切り口で良かった。

----

### [7. Swiss Table の実装に Deep Dive !](https://www.slideshare.net/slideshow/swiss-table-deep-dive-go-conference-2025/283475359)

[Keisuke Ishigamiさん](https://x.com/kei01234kei)によるセッション。

拝聴している時には、難しい……という感じであったが、
Go Conference 2024での[repluさん](https://x.com/replu5)の資料「[Understanding SwissTable for map performance](https://speakerdeck.com/andpad/understanding-swisstable-for-map-performance)」を見ながらだと、かなり腑に落ちた。

iterationのランダム化の仕組みに関しては普段あまり意識しない部分でもあり知ることが出来て良かった。
ただこれでも全体の半分くらいしか理解できていない気がしている……難しい……。

----

### [8. なぜGoのジェネリクスはこの形なのか？ - Featherweight Goが明かす設計の核心](https://speakerdeck.com/ryotaros/nazegonozienerikusuhakonoxing-nanoka-featherweight-gogaming-kasushe-ji-nohe-xin)

Ryotaro Suzukiさんによるセッション。

そもそも当初、"contracts"と呼ばれる概念を導入しようとしていたこと自体知らなかった。
またJavaのジェネリクスの考え方をベースにGoにも持ち込んでいたのも面白い。

が、理解できたのもこの辺りまで。FG/FGG辺りの話からついていけず。理解できる日は来るのだろうか。

----

### [9. Green Tea Garbage Collector の今：Go言語のコアチームによる試行錯誤の過程と共にメモリ管理最適化の実装を読み解く](https://speakerdeck.com/zchee/the-current-status-of-green-tea-gc)

[zcheeさん](https://x.com/_zchee_)によるセッション。

1.25でexperimentalに利用可能となったGreen Tea GCに関する解説。
リリースノート等で今までの単位より細かく見るようにした結果、効率が良くなった、らしい。程度の知識で拝聴。

まさかCPUとDRAMの性能乖離による影響がGCに響いているとは思わなかった。
意外だったのは既存のTri-color Parallel Markingから飛躍したアルゴリズムではなくて、
改善を加えつつ特定のケースにおける最適化を実施したようなもので、論理的にやってるんだなと感じた。それはそう。
各所で性能向上した話を聞くので、そろそろ利用してみるかという気持ちになった。

----

## スポンサーブース

### 1. ファインディ株式会社

Go-typingを開催していた。Macのキーボードは慣れないが賢者らしい。
Goを書く速度は異常に遅いので恥ずかしい。

{{< x user="intiramisu_" id="1972136162627407928" >}}

### 2. 株式会社カンム

Go Conference開催前日の金曜日にCTFを開催していることを知った。

{{< x user="ARC_AED" id="1971415909140193570" >}}

解いたので堅牢なソースを頂いた。

{{< x user="intiramisu_" id="1972153406501576855" >}}

ラベルにもGoのコードが記載されており、カンムのサイトへ飛べるURLが出てきて最後まで楽しかった。

### 3. 株式会社クロステック・マネジメント

大きく京都芸術大学と書かれていて目を惹かれたブース。
多摩美術大学や東京藝術大学と比較してマイナーであることと、校風として反骨精神が強いことから、
将来的には多くの人が学べるプラットフォームの場を提供すると熱く語っていたのが印象的。

### 4. 株式会社はてな

国産APMツールであるMackerelの紹介を行っていた。
Grafana好きおじさんなので、Mackerelはこうなって欲しいという話をした。
国産という強み、開発者と物理的に距離が近いことが他のAPMツールとは大きく異なるので今後が楽しみ。

----

## 全体的な感想

初？の2日間開催となり運営の方々には本当に頭が上がらない。
初参加であったものの全体的に楽しめ、来年も参加したい気になった。
ただ自身のGoの力不足なのもあるが、全体的に難度の高いセッションが多く良くも悪くもレベルが高く感じた。
次回はもう少し初心者、中級者向けのセッションがあると良いかと思った。
心残りとしてはワークショップに参加したかったので、来年も2日間開催であれば分散していただけると嬉しい。
