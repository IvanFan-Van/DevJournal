---
title: 什么是 Media Source Extension API
abbrlink: 76c77505
date: 2025-10-22 19:58:07
tags:
---
## MedianSource API

通常在前端我们想要播放音频只有拿到完整的音频数据我们才能进行播放, 利用 `audio` 标签元素的 src 属性.

src 属性可以设置为:
1. 音频文件的地址, 例如 "./audio.mp3"
2. base64 字符串, 例如: "data:audio/mpeg;base64,xxxxxx" 
3. objectURL, 例如: "blob:https://blog.csdn.net/1c1337e5-7efc-48e5-bd22-e51a33b90195"

- 第一种方式很容易理解, 浏览器会根据 src 属性提供的地址, 去请求数据, 然后进行处理.
  
- 第二种方式是通过 base64 编码音频二进制数据, 然后直接将数据嵌入到 audio 标签内进行播放, 但是这有一个缺点就是浏览器有 URL 长度限制, 例如 Chrome 是 2MB, Safari 是 4MB, Edge 是 65MB. 而 src 属性中的值视作为 URL, 所以说我们没办法嵌入 base64 编码后大小超过 URL 长度限制的音频数据. 
  
- 第三种方式是将音频数据转换为 ObjectURL, 浏览器可以为 blob 或 file 类型数据创建一个临时 url, 该 url 指向的资源通常保存在内存内, 所以当浏览器关闭时, 该临时 url 也会被释放. 其格式为 `blob:<origin>/uuid`. 通过这种方式, 我们可以借助浏览器临时保存我们的二进制数据, 然后获取其 ObjectURL 地址作为 audio 标签元素的 src 属性值. 
  
> 注意, 对于 ObjectURL 我们需要手动释放, 不然该内存会在浏览器运行期间一直存在, 占用内存.

我们可以使用浏览器中的全局 `URL` 对象创建和删除 ObjectURL

```javascript
const url = URL.createObjectURL(blob | file, options?); // 创建 ObjectURL
URL.revokeObjectURL(url); // 清理 url 保存的数据
```

但是现在有一个弊端, 就是上述三种方式都需要得到**完整的音频数据**才可以进行播放, 如果我们想实现**边读取边播放**, 例如后端通过流式响应音频数据, 然后前端边读取边播放, 这个时候我们可以考虑使用另一个 Web API: Media Source Extension

MSE 提供了一边读取一边播放的功能, 整个 MSE 包含以下核心组件, 可以类比成水管来进行理解

```
音频数据 -> MediaSource (进水口) -> SourceBufffer (蓄水池) -> audio (水龙头) -> 播放
```

整个 MSE 跟这三大组件息息相关 `MediaSource`, `SourceBuffer`, 以及 `audio`. 这三个组件的关系也如上所示. 为了演示我们一步一步来

首先为了能够播放, 我们需要 **"搭建整条输水系统"**, 我们先定义好我们需要的组件

```javascript
let mediaSource = null; // 进水口
let audio = null; // 水龙头
let sourceBuffer = null; // 蓄水池
let queue = []; // 缓冲区
```

其中我们还需要一个缓冲区, 用于存放蓄水池还未准备就绪时的水资源 (音频数据).

此时我们需要按步骤来搭建整个系统, 第一步是构建 **进水口** 和 **水龙头**, 然后将其连接在一起

```javascript
mediaSource = new MediaSource();
audio = new Audio(); // 创建一个 audio 元素, HTMLElement
audio.src = URL.createObjectURL(mediaSource); // 告诉浏览器 audio 的音频数据来自于这个 mediaSource
mediaSource.addEventListener("sourceopen", () => onSourceOpen()); // 当 mediaSourcce 就绪时, 执行 onSourceOpen 函数
```

我们一步一步解释, 首先第一第二行是创建这两个元素, 没什么问题吧. 到了第三行, 我们设置 `audio` 元素的 src 属性为以 `mediaSource` 构建的 `ObjectURL`. 这是什么意思. 首先 `audio` 是一个标签元素, 其 src 是一个指向音频数据的 url, 该 url 用来表示音频数据的位置, 让浏览器可以找到音频数据然后播放 ta. 其中 url 可以有三种格式 1) 音频文件的具体地址 2) 音频文件数据的base64编码 3) ObjectURL 地址

其中 ObjectURL 是浏览器在自己内存保存音频数据后生成的指向该音频数据的 URL 地址. 而 MediaSource 中的蓄水池, 就是我们未来的音频数据(我们会往里面输水). 所以在这里, 我们通过 `URL.createObjectURL(mediaSource)` 来获取 MediaSource 对象对应的 url. 此时浏览器就知道, 我们需要把水龙头和哪个输水口连接起来了.

但是我们为什么不在这里直接创建 `SourceBuffer` 呢? 因为创建 `SourceBuffer` 需要满足两个条件: 
1) MediaSource 对象已经被创建 (你得有输水口才能往里面输水, 合理吧, 不然你就创建一个蓄水池没有输水口不是扯淡吗) 
2) MediaSource 对象和媒体元素 (audio, video 等) 创建关联 (你得把输水口和水龙头连起来, 不然蓄水池的水没有人用, 就没必要创建了, 合理吧).

综上所述, 当以上两个条件全部满足时, `sourceopen` 事件会被触发, 此时我们都已经准备好了, 就可以创建蓄水池了. 所以蓄水池的创建操作就应该放在 sourceopen 事件的回调中.

> 注意, 并不是设置了 src 就会立刻触发 sourceopen 事件, sourceopen 事件只有当 MediaSource.readyStaet 为 open 时才会触发, 而 MediaSource.readyState 只有当以上两个条件成立时从 close => open.

> 上文中 MediaSource 和 媒体元素的关联, 具体指的是 MediaSource 被设置为媒体元素 pipeline 的组件之一时, 代表正式关联. 而该步骤是一个异步操作, 所以只有在浏览器执行完 js 同步代码后, 才会执行. 这就是为什么我们需要绑定监听函数异步执行

ok 那最后一行代码添加监听函数就很容易理解了, 这个监听函数会在 MediaSource 准备好的时候, 即水龙头和输水口都连接好的时候被触发, 而 onSourceOpen 函数最重要的一个点就是创建我们的蓄水池.

![](file-20251022172459163.png)
现在我们来实现 `onSourceOpen` 函数

```javascript
function onSourceOpen() {
	sourceBuffer = mediaSource.addSourceBuffer(<mimetype>); // 蓄水池要和输水口相关联, 知道从哪取水, 合理吧, 所以我们使用在 MediaSource 上的 addSourceBuffer 方法来为该输水口添加一个蓄水池. 
	sourceBuffer.mode = "sequence" | "segments"
	
	// 当加完当前的水后通知你加完了
	sourceBuffer.addEventListener("updateend", () => onUpdateEnd());
	// 当加水出错时通知你出问题了
	sourceBuffer.addEventListener("error", (err) => onBufferError(err));
}
```

现在我们仍旧一步一步看代码, 首先第一行代码, 我们通过调用 `MediaSource.addSourceBuffer()` 来创建一个蓄水池, 你一个蓄水池肯定得知道水从哪里来, 并且蓄水池创建的时候输水口肯定存在 (由于此时是 sourceopen 事件触发后的回调函数, 所以 MediaSource.readyState = open, 而该条件意味着上面两个情况都满足), 所以通过输水口来添加我们的蓄水池, 合理吧.

其中创建 `SourceBuffer` 传入的参数是一个 mimetype 字符串, 我们总得告诉蓄水池存的是污水还是纯净水吧. 所以 mimetype 指的就是媒体数据的类型, 例如如果我们存储的是 MP3 音频数据, mimetype 就是 `audio/mpeg`, 如果是 MP4 类型的数据, 就是 `audio/mp4`, 还有很多其他不同的类型, 例如 WAV, OPUS, OGG 等等. 我们可以通过调用 `MediaSource.isTypeSupport(<mimetype>) -> bool` 来查看该 mimetype 是否被 MediaSource 支持. 例如裸 ACC 格式的音频数据 `audio/acc` 就是不被支持的.

第二个则是设置我们蓄水池的 `mode` 属性, 有两种可以选
- 'segments'模式：按时间戳排序
- 'sequence'模式：按添加顺序排序

有些时候, 从后端发来的媒体数据并不是按顺序的, 可能是乱序的 (由于多线程处理等关系), 此时我们亲爱的 SourceBuffer 可以帮助我们重新整理 Ta 们的顺序, 而 mode 就是设置这个顺序, 但注意, 只有元数据中包含时间戳的媒体数据才可以设置 segments 模式, 不然会报错, 例如 MP3 音频数据不包含任何时间戳, 所以只能设置 sequence 数据. 而 sequence 模式就是你怎么添加的就怎么进去. 你乱序给我我就这么个顺序往里存, 所以当处理这些类型数据时, 需要小心的和后端沟通, 看返回的数据是乱序还是有序, 以及是否支持 segments 模式.

那有人就要问了, 主播主播, 既然蓄水池不仅仅存水, 还会负责整理这些数据, 要是蓄水池还在整理这些数据的时候, 输水口又来水了怎么办啊. 很简单, 凉拌, 如果在蓄水池还在处理的时候 (可以通过 `sourceBuffer.updating` 属性来查看是否还在处理当前数据) 往里面添加数据, sourceBuffer 会直接抛出 Error, 撂担子不干了. 

那我们该如何应付这种情况呢?  欸, 所以 SourceBuffer 就提供了两个事件给我们, 第一个是 `updateend`, 当 SourceBuffer 处理完数据后, 就会触发这个事件, 有了这个事件我们就知道该在什么时候往蓄水池里继续加水了, 而 `error` 事件非常大众, 也就不用说了吧, 就是加水的时候如果出问题了, 比如你加的水和蓄水池存的水类型不同, 例如蓄水池设置存储 audio/mpeg, 结果你往里面加 audio/mp4 类型的数据, 这可不就乱了吗, 此时就会触发 `error` 事件, 并且将 `err` 作为参数传递给回调函数. 

ok 现在我们总算把整个输水系统构建完了, 下一步就可以开始使用 ta 了, 让我们看看怎么往里面加水吧.

```javascript
sourceBuffer.appendBuffer(buffer); // buffer 是一个 Buffer 类型的数据, 例如 UInt8Array
```

ok, 结束了, 就这么突然, 我们通过调用 `SourceBuffer.appendBuffer` 就可以往蓄水池里加水了. 但是主播主播, 真这么简单吗? 如果你仔细看了上面的内容, 你应该记得, 如果蓄水池正在处理, 那你直接调用 `appendBuffer` 往里加水, 人家直接报错给你看. 此时, 我们最早定义的那个 `queue` 就体现用处了, 我们可以把一些数据先暂存起来, 等蓄水池处理好手头上的工作时, 在从 queue 里面把数据给 ta. 有人问, 那我可不可以不使用 `queue`, 而是等着蓄水池工作完再添加不就行了嘛. 理论可行, 但是这么做有个大弊端, 就是判断蓄水池工作完毕没你需要使用一个 while loop 不停的检查, 此时整个线程就会阻塞在那一行代码, 你整个应用直接就 game over 了. 而添加一个缓冲区 `queue` 之后, 你的代码可以将数据先暂存起来, 就不会被阻塞了, 可以继续处理.

好了废话不多说, 来看看如何利用 `queue` 来安全高效的使用这套输水系统吧

```javascript
function processQueue(buffer) {
	// 如果蓄水池没有在工作, 并且 queue 中有任务, 则交给蓄水池处理
	if (!sourceBuffer.updating && queue.length > 0) {
		const buffer = queue.shift();
		sourceBuffer.appendBuffer(buffer); 
	}
}

function appendBuffer(buffer) {
	// 如果蓄水池没有在工作, 同时 queue 是空的, 则直接交给蓄水池即可
	if (!bufferSource.updating && queue.length === 0) {
		sourceBuffer.appendBuffer(buffer);
		return;
	}
	// 其他情况就先放到 queue 里暂存起来
	queue.push(buffer);
}

function onUpdateEnd() {
	this.processQueue();
}
```

上面两个函数可以类比 `消费者-生产者` 模型, 其中 `SourceBuffer` 是消费者, 负责消费 `queue` 中堆积的数据. 而生产者则是我们获取音频数据的 `fetch` 之类的 API, 从后端获取我们的音频数据, 然后流式的将其存入. 那我们没有循环, 在执行完 `processQueue` 消费完一个音频数据后, 我们什么时候应该取出下一个数据来进行处理呢? 小聪明一定想到了前面提到的 `updateend` 事件, 该事件会当 `SourceBuffer` 处理完手头的工作后触发, 也就是说现在蓄水池已经准备好接收下一个数据了, 所以我们直接在 onUpdateEnd 中调用 `processQueue()` 让 `SourceBuffer` 继续处理下一个数据即可. 如果 queue 中没有下一个数据, 则会停止, 直到下一次 appendBuffer 被触发.

至此, 我们已经完整实现了 `MediaSource` ... 吗? 其实还有最后一步要走, 就是将我们精心准备的 audio 元素挂载到 DOM 上! 只有当 audio 元素挂载了这一切才会发生, 不然浏览器都不知道该元素的存在, 又怎么会触发这些逻辑呢. 所以我们只需要在主文件中将其挂载即可, 以下是一个示例代码

```javascript
document.addEventListener("DOMContentLoaded", async () => {
	// other code ...
	document.body.appendChild(audio); // 将 audio 元素挂载到 DOM 树上
	// other code ...
	// 从 url 地址获取水, 假设 url 地址是一个 TTS 模型, 我们将文本传递给 ta, ta 会返回我们音频数据
	const response = await fetch(url);
	// getReader() 会返回一个字节流读取器, 因为我们是二进制数据, 所以使用 reader 流式读取
	const reader = response.body.getReader();
	while (true) {
		// 开始输水
		const { done, value } = await reader.read();
		// 如果水取完了就结束
		if (done) break;
		// 注水, 将 value (二进制数据) 注入到我们的输水系统 
		appendBuffer(value);
	}
	
	// other code ...
})
```

这样子我们亲爱的输水系统就已经开始运作啦. 当第一个字节被 appendBuffer 传输给我们的输水系统时, 该字节会被 MediaSource 塞到蓄水池中, 然后被传输到我们的媒体标签 (水龙头) 进行播放, 只要你注水不停, 音频播放就不会停止, 音频开始于第一次注水, 这样就极大的优化了用户等待事件, 用户第一次听到或获取到音频不再是等待完整的音频被加载后才开始播放 O(n) 时间复杂度 (随着音频大小等待时间呈线性增长), 现在我们的 tts 系统是 O(1) 复杂度, 不管音频数据有多大, 当第一个字节被读取的时候, 音频就开始了播放. 至此, 我们完成了一次质的飞跃, 当然这里的代码还有很多未完善的地方, 包括很多错误处理, 日志信息, 对不同类型的支持, 对多个音频源的组合等. 

但希望这篇博客能够带给你一个粗略的对于 Media Source Extension 这个极具魅力的 Web API 的感觉.