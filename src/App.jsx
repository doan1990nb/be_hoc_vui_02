import { useState, useEffect, useRef } from "react";

// ══════════════════════════════════════════════════════════════
//  BÉ HỌC VUI v8 — Phiên bản hoàn thiện
//
//  ✅ MỚI TRONG V8:
//  1. Voice slots cho MP3 thật (cấu trúc sẵn — chỉ cần URL)
//  2. Chọn độ tuổi 2-3 / 3-5 / 5-6
//  3. Story mode đầy đủ — chuyện 5 phút
//  4. 2 game vận động tinh: Tô màu + Vẽ theo nét
//  5. Bảng điều khiển phụ huynh (PIN 1234)
//  6. Chế độ "Học cùng bố mẹ" (không tự đọc, bố mẹ đọc)
//  7. AI nhẹ — nhớ bài sai → ôn lại
//  8. (Cộng đồng — cần backend, để dành)
// ══════════════════════════════════════════════════════════════

const S = {
  get:(k,d)=>{try{return JSON.parse(localStorage.getItem("bhv8_"+k))??d;}catch{return d;}},
  set:(k,v)=>{try{localStorage.setItem("bhv8_"+k,JSON.stringify(v));}catch{}},
};

const buzz = (ms=10) => { try { navigator.vibrate?.(ms); } catch {} };

// ── PHẦN 1: VOICE SLOTS ──
// Trong app này dùng TTS. Khi có MP3 thật, đặt vào VOICE_FILES
// rồi đổi USE_REAL_VOICE = true. Cấu trúc:
//   VOICE_FILES = { "cat": "/audio/cat.mp3", "dog": "/audio/dog.mp3" }
const USE_REAL_VOICE = false;
const VOICE_FILES = {}; // { lessonId: "url.mp3" }
const _audioCache = {};
const playRealVoice = (id) => {
  if (!VOICE_FILES[id]) return false;
  try {
    if (!_audioCache[id]) _audioCache[id] = new Audio(VOICE_FILES[id]);
    _audioCache[id].currentTime = 0;
    _audioCache[id].play().catch(()=>{});
    return true;
  } catch { return false; }
};

// ── TTS (fallback) ──
let _voices = [];
if (typeof window !== "undefined") {
  const load = () => { _voices = window.speechSynthesis?.getVoices() || []; };
  load();
  window.speechSynthesis?.addEventListener("voiceschanged", load);
}
const speak = (text, lang="vi-VN", rate=0.78, pitch=1.18, lessonId=null) => {
  if (USE_REAL_VOICE && lessonId && playRealVoice(lessonId)) return;
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang=lang; u.rate=rate; u.pitch=pitch; u.volume=1;
  const v = _voices.find(x=>x.lang.startsWith(lang.split("-")[0])&&/google|premium/i.test(x.name))
          || _voices.find(x=>x.lang.startsWith(lang.split("-")[0]));
  if (v) u.voice=v;
  window.speechSynthesis.speak(u);
};

// ── Web Audio ──
let _ac = null;
const getAC = () => {
  if (!_ac) try { _ac = new (window.AudioContext||window.webkitAudioContext)(); } catch {}
  if (_ac?.state==="suspended") _ac.resume();
  return _ac;
};
const note = (f, d, t="triangle", v=0.18, delay=0) => {
  const ac=getAC(); if(!ac) return;
  const t0=ac.currentTime+delay;
  try {
    const o=ac.createOscillator(),g=ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type=t; o.frequency.value=f;
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(v,t0+0.02);
    g.gain.exponentialRampToValueAtTime(0.001,t0+d);
    o.start(t0); o.stop(t0+d);
  } catch {}
};
const N = { C5:523, D5:587, E5:659, F5:698, G5:784, A5:880, C6:1047 };
const sfx = {
  tap:     () => note(660, 0.05, "sine", 0.1),
  correct: () => [N.C5,N.E5,N.G5,N.C6].forEach((f,i)=>note(f,0.18,"triangle",0.2,i*0.08)),
  wrong:   () => note(200, 0.3, "sawtooth", 0.1),
  win:     () => [[N.C5,0.15,0],[N.C5,0.15,0.15],[N.G5,0.3,0.3],[N.E5,0.15,0.6],[N.C5,0.15,0.75],[N.G5,0.4,0.9]].forEach(([f,d,t])=>note(f,d,"triangle",0.22,t)),
  pop:     () => note(880, 0.08, "sine", 0.15),
};

const shuffle = a => a.slice().sort(()=>Math.random()-.5);


const TOPICS = [
  { id:"animals", label:"Động vật", icon:"🐾", color:"#FF6B6B", grad:"linear-gradient(135deg,#FF6B6B,#FF8E53)",
    lessons:[
      {id:"cat",    vi:"Con mèo",    en:"Cat",       img:"🐱", rhyme:"Mèo kêu meo meo\nNhảy qua nhảy lại\nBắt chuột tài giỏi\nMèo ơi mèo ơi!"},
      {id:"dog",    vi:"Con chó",    en:"Dog",       img:"🐶", rhyme:"Chó con gâu gâu\nVẫy đuôi thật vui\nCanh nhà ngoan lắm\nChó ơi chó ơi!"},
      {id:"cow",    vi:"Con bò",     en:"Cow",       img:"🐄", rhyme:"Bò ơi bò ơi\nSữa ngon bổ lắm\nUống vào mau lớn\nBò hiền lắm nha!"},
      {id:"rabbit", vi:"Con thỏ",    en:"Rabbit",    img:"🐰", rhyme:"Thỏ trắng tai dài\nNhảy nhảy nhảy nào\nĂn cà rốt giòn\nThỏ xinh quá hà!"},
      {id:"frog",   vi:"Con ếch",    en:"Frog",      img:"🐸", rhyme:"Ếch xanh nhảy cao\nỘp ộp ộp ộp\nNgồi trên lá sen\nẾch vui lắm nha!"},
      {id:"bird",   vi:"Con chim",   en:"Bird",      img:"🐦", rhyme:"Chim hót líu lo\nBay trên bầu trời\nCánh nhỏ xinh xinh\nChim vui hót ca!"},
      {id:"fish",   vi:"Con cá",     en:"Fish",      img:"🐟", rhyme:"Cá bơi tung tăng\nTrong làn nước mát\nVảy sáng lấp lánh\nCá đẹp lắm nha!"},
      {id:"pig",    vi:"Con lợn",    en:"Pig",       img:"🐷", rhyme:"Lợn hồng bé bé\nỤt ịt ụt ịt\nMũi tròn đáng yêu\nLợn con dễ thương!"},
      {id:"elephant",vi:"Con voi",   en:"Elephant",  img:"🐘", rhyme:"Voi to voi lớn\nVòi dài uốn cong\nTắm mưa sung sướng\nVoi thật vui vẻ!"},
      {id:"tiger",  vi:"Con hổ",     en:"Tiger",     img:"🐯", rhyme:"Hổ vằn đẹp lắm\nGầm vang núi rừng\nChạy nhanh như gió\nHổ thật oai hùng!"},
      {id:"monkey", vi:"Con khỉ",    en:"Monkey",    img:"🐒", rhyme:"Khỉ trèo cây giỏi\nĂn chuối ngon lắm\nNhảy nhót vui đùa\nKhỉ con tinh nghịch!"},
      {id:"duck",   vi:"Con vịt",    en:"Duck",      img:"🦆", rhyme:"Vịt kêu cạp cạp\nBơi trên ao hồ\nMỏ vàng xinh xinh\nVịt đáng yêu quá!"},
      {id:"horse",  vi:"Con ngựa",   en:"Horse",     img:"🐴", rhyme:"Ngựa phi nhanh lắm\nBờm dài tung bay\nChở người vui vẻ\nNgựa ơi ngựa ơi!"},
      {id:"sheep",  vi:"Con cừu",    en:"Sheep",     img:"🐑", rhyme:"Cừu trắng bông bông\nMê mê mê mê\nLen mềm ấm lắm\nCừu ơi cừu ơi!"},
      {id:"bear",   vi:"Con gấu",    en:"Bear",      img:"🐻", rhyme:"Gấu to gấu lớn\nThích ăn mật ong\nNằm ngủ mùa đông\nGấu ơi gấu ơi!"},
      {id:"penguin",vi:"Chim cánh cụt",en:"Penguin", img:"🐧", rhyme:"Cánh cụt đi đứng\nTập tễnh rất vui\nSống ở Nam Cực\nLạnh mà vẫn vui!"},
      {id:"giraffe",vi:"Hươu cao cổ",en:"Giraffe",  img:"🦒", rhyme:"Cổ dài cao lắm\nĂn lá trên cây\nChân dài bước lớn\nHươu cao cổ ơi!"},
      {id:"lion",   vi:"Con sư tử",  en:"Lion",      img:"🦁", rhyme:"Sư tử vua rừng\nGầm vang núi xanh\nBờm vàng oai vệ\nSư tử mạnh lắm!"},
      {id:"crocodile",vi:"Cá sấu",   en:"Crocodile", img:"🐊", rhyme:"Cá sấu răng to\nNằm ven bờ sông\nMở miệng to hoắc\nCá sấu dữ lắm!"},
      {id:"owl",    vi:"Con cú",     en:"Owl",       img:"🦉", rhyme:"Cú mèo đêm bay\nHu hu hu hu\nMắt tròn to lắm\nCú ơi cú ơi!"},
      {id:"butterfly",vi:"Con bướm", en:"Butterfly", img:"🦋", rhyme:"Bướm bay phấp phới\nCánh đẹp màu sắc\nHút mật hoa thơm\nBướm ơi bướm ơi!"},
      {id:"snail",  vi:"Con ốc sên", en:"Snail",     img:"🐌", rhyme:"Ốc sên bò chậm\nNhà trên lưng mang\nTừng bước từng bước\nỐc sên đáng yêu!"},
      {id:"bee",    vi:"Con ong",    en:"Bee",       img:"🐝", rhyme:"Ong vàng vo ve\nHút mật hoa thơm\nLàm mật ngọt ngon\nOng ơi ong ơi!"},
      {id:"ant",    vi:"Con kiến",   en:"Ant",       img:"🐜", rhyme:"Kiến đi từng đàn\nNhanh nhẹn chăm chỉ\nKhuân mồi về tổ\nKiến ơi kiến ơi!"},
      {id:"spider", vi:"Con nhện",   en:"Spider",    img:"🕷️", rhyme:"Nhện giăng tơ đẹp\nLưới mỏng manh manh\nTám chân nhanh nhẹn\nNhện ơi nhện ơi!"},
      {id:"snake",  vi:"Con rắn",    en:"Snake",     img:"🐍", rhyme:"Rắn dài uốn lượn\nKhông chân vẫn bò\nLưỡi chẻ thè ra\nRắn ơi rắn ơi!"},
      {id:"turtle", vi:"Con rùa",    en:"Turtle",    img:"🐢", rhyme:"Rùa bò chậm chậm\nMai cứng lưng tròn\nSống lâu ngàn năm\nRùa hiền lắm nha!"},
      {id:"dolphin",vi:"Cá heo",     en:"Dolphin",   img:"🐬", rhyme:"Cá heo thông minh\nNhảy lên khỏi nước\nBơi nhanh đáng yêu\nCá heo vui vẻ!"},
      {id:"whale2", vi:"Cá voi",     en:"Whale",     img:"🐳", rhyme:"Cá voi to lớn\nĐại dương rộng mênh\nPhun nước cao cao\nCá voi hiền hòa!"},
      {id:"shark",  vi:"Cá mập",     en:"Shark",     img:"🦈", rhyme:"Cá mập răng to\nBơi trong đại dương\nVây sắc bén lắm\nCá mập dũng mãnh!"},
      {id:"crab",   vi:"Con cua",    en:"Crab",      img:"🦀", rhyme:"Cua bò ngang nhanh\nKẹp càng to khỏe\nỞ trong vỏ cứng\nCua ơi cua ơi!"},
      {id:"octopus",vi:"Bạch tuộc",  en:"Octopus",   img:"🐙", rhyme:"Bạch tuộc tám chân\nUốn éo dưới biển\nThông minh đáng yêu\nBạch tuộc tài giỏi!"},
      {id:"deer",   vi:"Con hươu",   en:"Deer",      img:"🦌", rhyme:"Hươu hiền chạy nhanh\nSừng đẹp trên đầu\nĂn lá uống suối\nHươu ơi hươu ơi!"},
      {id:"fox",    vi:"Con cáo",    en:"Fox",       img:"🦊", rhyme:"Cáo lông màu cam\nThông minh tinh ranh\nĐuôi dài bồng bềnh\nCáo ơi cáo ơi!"},
      {id:"panda",  vi:"Gấu trúc",   en:"Panda",     img:"🐼", rhyme:"Gấu trúc đen trắng\nĂn tre suốt ngày\nLười nhác đáng yêu\nGấu trúc xinh xinh!"},
    ]},
  { id:"fruits", label:"Trái cây", icon:"🍎", color:"#00B894", grad:"linear-gradient(135deg,#00B894,#00CEC9)",
    lessons:[
      {id:"apple",  vi:"Quả táo",    en:"Apple",      img:"🍎", rhyme:"Táo đỏ tươi tươi\nGiòn ngon ngọt lắm\nĂn táo thêm khỏe\nTáo ơi táo ơi!"},
      {id:"banana", vi:"Quả chuối",  en:"Banana",     img:"🍌", rhyme:"Chuối vàng ngọt lịm\nBóc vỏ ăn ngon\nKhỉ thích chuối lắm\nBé cũng thích nha!"},
      {id:"orange", vi:"Quả cam",    en:"Orange",     img:"🍊", rhyme:"Cam tròn thơm phức\nVắt lấy nước uống\nVitamin nhiều lắm\nCam ngon tuyệt vời!"},
      {id:"grape",  vi:"Quả nho",    en:"Grape",      img:"🍇", rhyme:"Nho tím chùm chùm\nĂn vào ngọt mát\nNhỏ xinh đáng yêu\nNho ơi nho ơi!"},
      {id:"water",  vi:"Dưa hấu",    en:"Watermelon", img:"🍉", rhyme:"Dưa hấu to tròn\nRuột đỏ ngọt mát\nMùa hè ăn ngon\nDưa hấu mát lạnh!"},
      {id:"straw",  vi:"Dâu tây",    en:"Strawberry", img:"🍓", rhyme:"Dâu đỏ tim tim\nNgọt chua thơm lắm\nNhỏ xinh đẹp quá\nDâu ơi dâu ơi!"},
      {id:"mango",  vi:"Quả xoài",   en:"Mango",      img:"🥭", rhyme:"Xoài vàng thơm lừng\nNgọt ngào hương vị\nCắn một miếng ngon\nXoài ơi ngon quá!"},
      {id:"cherry", vi:"Anh đào",    en:"Cherry",     img:"🍒", rhyme:"Anh đào đỏ tươi\nĐôi quả xinh xinh\nNgọt thơm ngon lắm\nAnh đào đẹp quá!"},
      {id:"pine",   vi:"Quả dứa",    en:"Pineapple",  img:"🍍", rhyme:"Dứa to gai gai\nRuột vàng ngọt chua\nLàm nước ép ngon\nDứa ơi dứa ơi!"},
      {id:"kiwi",   vi:"Quả kiwi",   en:"Kiwi",       img:"🥝", rhyme:"Kiwi xanh mướt\nCắt ra thơm lừng\nĂn vào khỏe lắm\nKiwi ngon tuyệt!"},
      {id:"pineapple",vi:"Quả dứa",  en:"Pineapple",  img:"🍍", rhyme:"Dứa to gai gai\nRuột vàng ngọt chua\nLàm nước ép ngon\nDứa ơi dứa ơi!"},
      {id:"coconut", vi:"Quả dừa",   en:"Coconut",    img:"🥥", rhyme:"Dừa xanh cao lắm\nNước ngọt mát lành\nCơm dừa béo thơm\nDừa ơi dừa ơi!"},
      {id:"peach",   vi:"Quả đào",   en:"Peach",      img:"🍑", rhyme:"Đào hồng mềm mại\nVỏ mịn thơm lừng\nCắn vào ngọt lịm\nĐào ơi đào ơi!"},
      {id:"lemon",   vi:"Quả chanh", en:"Lemon",      img:"🍋", rhyme:"Chanh vàng chua chua\nVắt nước uống ngon\nVitamin nhiều lắm\nChanh ơi chanh ơi!"},
      {id:"melon",   vi:"Quả dưa",   en:"Melon",      img:"🍈", rhyme:"Dưa xanh ruột vàng\nNgọt mát thơm phức\nMùa hè ăn ngon\nDưa ơi dưa ơi!"},
      {id:"pear",    vi:"Quả lê",    en:"Pear",       img:"🍐", rhyme:"Lê xanh giòn giòn\nNgọt mát thơm lừng\nĂn vào khỏe lắm\nLê ơi lê ơi!"},
      {id:"plum",    vi:"Quả mận",   en:"Plum",       img:"🫐", rhyme:"Mận tím bé bé\nNgọt chua thơm lắm\nViên tròn xinh xinh\nMận ơi mận ơi!"},
      {id:"fig",     vi:"Quả sung",  en:"Fig",        img:"🍒", rhyme:"Sung chín đỏ tươi\nNgọt lịm thơm ngon\nMọc thành từng chùm\nSung ơi sung ơi!"},
      {id:"guava",   vi:"Quả ổi",    en:"Guava",      img:"🍏", rhyme:"Ổi xanh giòn giòn\nĂn với muối ngon\nVườn nhà có ổi\nỔi ơi ổi ơi!"},
      {id:"papaya",  vi:"Quả đu đủ", en:"Papaya",     img:"🧡", rhyme:"Đu đủ chín vàng\nNgọt mềm thơm lừng\nTốt cho sức khỏe\nĐu đủ ngon lắm!"},
      {id:"avocado", vi:"Bơ",         en:"Avocado",    img:"🥑", rhyme:"Bơ xanh béo ngậy\nMềm mịn thơm ngon\nLàm sinh tố ngon\nBơ ơi bơ ơi!"},
      {id:"longan",  vi:"Nhãn",       en:"Longan",     img:"🟤", rhyme:"Nhãn tròn ngọt mát\nMọng nước thơm lừng\nMọc thành từng chùm\nNhãn ơi nhãn ơi!"},
      {id:"lychee",  vi:"Vải",        en:"Lychee",     img:"🔴", rhyme:"Vải đỏ ngọt lịm\nBóc vỏ ăn ngon\nMùa hè thơm phức\nVải ơi vải ơi!"},
      {id:"durian",  vi:"Sầu riêng",  en:"Durian",     img:"🟢", rhyme:"Sầu riêng gai gai\nThơm lừng đặc biệt\nMùi hương ai cũng nhớ\nSầu riêng độc đáo!"},
      {id:"jackfruit",vi:"Mít",       en:"Jackfruit",  img:"🟡", rhyme:"Mít to vỏ gai\nMúi vàng ngọt thơm\nẢm cả phòng nhà\nMít ngon ngon lắm!"},
      {id:"rambutan",vi:"Chôm chôm",  en:"Rambutan",   img:"🔺", rhyme:"Chôm chôm đỏ tươi\nLông xoăn xoăn ơi\nNgọt mát thơm phức\nChôm chôm ngon quá!"},
      {id:"dragon",  vi:"Thanh long", en:"Dragon fruit",img:"🐲", rhyme:"Thanh long vỏ hồng\nRuột trắng hạt đen\nNgọt mát đẹp lắm\nThanh long xinh xinh!"},
      {id:"persimmon",vi:"Hồng",      en:"Persimmon",  img:"🟧", rhyme:"Hồng vàng cam tươi\nNgọt như mật ong\nMùa thu thơm ngon\nHồng ơi hồng ơi!"},
      {id:"starfruit",vi:"Khế",       en:"Starfruit",  img:"⭐", rhyme:"Khế hình ngôi sao\nCắt ra đẹp lắm\nChua chua ngọt ngọt\nKhế ơi khế ơi!"},
      {id:"pomelo",  vi:"Bưởi",       en:"Pomelo",     img:"🟢", rhyme:"Bưởi to tròn xanh\nMúi ngọt thơm ngon\nTết Trung thu ăn\nBưởi ơi bưởi ơi!"},
      {id:"tomato",  vi:"Cà chua",    en:"Tomato",     img:"🍅", rhyme:"Cà chua đỏ tươi\nMọng nước ngon lắm\nNấu canh xào nấu\nCà chua bổ dưỡng!"},
      {id:"carrot",  vi:"Cà rốt",     en:"Carrot",     img:"🥕", rhyme:"Cà rốt cam tươi\nThỏ thích ăn nhất\nGiòn ngọt bổ mắt\nCà rốt ngon quá!"},
    ]},
  { id:"colors", label:"Màu sắc", icon:"🎨", color:"#6C5CE7", grad:"linear-gradient(135deg,#6C5CE7,#a29bfe)",
    lessons:[
      {id:"red",    vi:"Màu đỏ",       en:"Red",    img:"🍎", c:"#FF4757", rhyme:"Đỏ đỏ đỏ ơi\nNhư quả táo chín\nNhư mặt trời lặn\nĐỏ đẹp lắm nha!"},
      {id:"blue",   vi:"Màu xanh",     en:"Blue",   img:"💧", c:"#1E90FF", rhyme:"Xanh xanh xanh ơi\nNhư bầu trời cao\nNhư biển cả rộng\nXanh đẹp lắm nha!"},
      {id:"yellow", vi:"Màu vàng",     en:"Yellow", img:"🌟", c:"#FFC312", rhyme:"Vàng vàng vàng ơi\nNhư mặt trời sáng\nNhư hoa hướng dương\nVàng đẹp lắm nha!"},
      {id:"green",  vi:"Màu xanh lá",  en:"Green",  img:"🌿", c:"#2ECC71", rhyme:"Xanh lá xanh lá\nNhư rừng cây xanh\nNhư lá non mướt\nXanh lá đẹp nha!"},
      {id:"pink",   vi:"Màu hồng",     en:"Pink",   img:"🌸", c:"#FF6B81", rhyme:"Hồng hồng hồng ơi\nNhư hoa anh đào\nNhư kẹo bông bông\nHồng đẹp lắm nha!"},
      {id:"orange2",vi:"Màu cam",      en:"Orange", img:"🍊", c:"#FF9F43", rhyme:"Cam cam cam ơi\nNhư quả cam chín\nNhư nắng chiều tà\nMàu cam đẹp nha!"},
      {id:"purple", vi:"Màu tím",      en:"Purple", img:"🍇", c:"#9B59B6", rhyme:"Tím tím tím ơi\nNhư chùm nho chín\nNhư hoa oải hương\nTím đẹp lắm nha!"},
      {id:"white",  vi:"Màu trắng",    en:"White",  img:"☁️", c:"#DFE6E9", rhyme:"Trắng trắng trắng ơi\nNhư mây bông bông\nNhư tuyết mùa đông\nTrắng tinh khiết nha!"},
      {id:"brown",  vi:"Màu nâu",      en:"Brown",  img:"🐻", c:"#8B4513", rhyme:"Nâu nâu nâu ơi\nNhư thân cây to\nNhư gấu teddy\nNâu ấm áp nha!"},
      {id:"gray",   vi:"Màu xám",      en:"Gray",   img:"🐘", c:"#95A5A6", rhyme:"Xám xám xám ơi\nNhư voi to lớn\nNhư đá cuội cứng\nXám đẹp lắm nha!"},
      {id:"gold",   vi:"Màu vàng kim", en:"Gold",   img:"🏆", c:"#F9CA24", rhyme:"Vàng kim sáng lắm\nNhư huy chương vàng\nNhư ánh nắng sáng\nVàng kim đẹp quá!"},
      {id:"silver", vi:"Màu bạc",      en:"Silver", img:"🌟", c:"#B2BEC3", rhyme:"Bạc bạc bạc ơi\nNhư vì sao sáng\nNhư gương soi mặt\nBạc đẹp lắm nha!"},
      {id:"navy",   vi:"Màu xanh đậm", en:"Navy",   img:"🌊", c:"#2C3E50", rhyme:"Xanh đậm xanh đậm\nNhư biển đêm tối\nNhư bầu trời khuya\nXanh đậm đẹp quá!"},
      {id:"lime",   vi:"Màu xanh nõn", en:"Lime",   img:"🍃", c:"#A8E063", rhyme:"Xanh nõn xanh nõn\nNhư lá non mới\nNhư búp mầm xanh\nXanh nõn đẹp quá!"},
      {id:"sky",    vi:"Màu xanh nhạt",en:"Sky blue",img:"🩵",c:"#74B9FF", rhyme:"Xanh nhạt xanh nhạt\nNhư trời ban mai\nNhư sương mai sớm\nXanh nhạt đẹp quá!"},
      {id:"violet", vi:"Màu tím nhạt", en:"Violet", img:"💜",c:"#D6A2E8", rhyme:"Tím nhạt dịu dàng\nNhư hoa oải hương\nMàu của thiên nhiên\nTím nhạt đẹp lắm!"},
      {id:"magenta",vi:"Màu hồng đậm", en:"Magenta",img:"💗",c:"#E84393", rhyme:"Hồng đậm rực rỡ\nNhư hoa hồng đỏ\nNổi bật sáng tươi\nHồng đậm đẹp quá!"},
      {id:"teal",   vi:"Màu xanh ngọc",en:"Teal",   img:"💚",c:"#1ABC9C", rhyme:"Xanh ngọc đẹp lắm\nNhư đá ngọc bích\nMàu sáng dịu mắt\nXanh ngọc đáng yêu!"},
      {id:"coral",  vi:"Màu san hô",  en:"Coral",  img:"🪸",c:"#FF7675", rhyme:"San hô đỏ hồng\nNhư rạn dưới biển\nĐẹp lung linh lắm\nMàu san hô tuyệt!"},
      {id:"mint",   vi:"Màu xanh bạc hà",en:"Mint",img:"🌱",c:"#55EFC4", rhyme:"Bạc hà mát lạnh\nNhư lá bạc hà\nXanh dịu mắt nhỉ\nBạc hà thanh mát!"},
      {id:"crimson",vi:"Màu đỏ đậm",  en:"Crimson",img:"❤️‍🔥",c:"#C0392B", rhyme:"Đỏ đậm mạnh mẽ\nNhư lửa hồng cháy\nNổi bật rực rỡ\nĐỏ đậm đẹp quá!"},
      {id:"emerald",vi:"Màu xanh ngọc lục",en:"Emerald",img:"💎",c:"#27AE60", rhyme:"Ngọc lục bích đẹp\nNhư rừng cây tươi\nXanh đậm sang trọng\nNgọc lục bích quý!"},
      {id:"indigo", vi:"Màu chàm",    en:"Indigo", img:"🟣",c:"#5F27CD", rhyme:"Chàm tím đậm sâu\nNhư trời đêm khuya\nMàu của bí ẩn\nMàu chàm huyền bí!"},
      {id:"beige",  vi:"Màu be",      en:"Beige",  img:"🟫",c:"#F1C27D", rhyme:"Be nhẹ nhàng quá\nNhư cát biển vàng\nẤm áp êm dịu\nMàu be thân thiện!"},
      {id:"maroon", vi:"Màu nâu đỏ",  en:"Maroon", img:"🍷",c:"#8E2024", rhyme:"Nâu đỏ sâu đậm\nNhư rượu vang nồng\nẤm áp sang trọng\nMàu nâu đỏ tuyệt!"},
      {id:"olive",  vi:"Màu xanh olive",en:"Olive",img:"🫒",c:"#7D8C00", rhyme:"Xanh olive đẹp\nNhư quả olive\nMàu tự nhiên hay\nOlive đáng yêu!"},
      {id:"turquoise",vi:"Màu lam ngọc",en:"Turquoise",img:"🩵",c:"#48DBFB", rhyme:"Lam ngọc tươi mát\nNhư biển nhiệt đới\nXanh trong veo lắm\nLam ngọc đẹp quá!"},
      {id:"lavender",vi:"Màu oải hương",en:"Lavender",img:"💐",c:"#A29BFE", rhyme:"Oải hương tím nhẹ\nThơm dịu nhẹ nhàng\nNhư cánh đồng hoa\nOải hương đẹp quá!"},
      {id:"peach2", vi:"Màu hồng đào", en:"Peach", img:"🍑",c:"#FFAB91", rhyme:"Hồng đào dịu nhẹ\nNhư bình minh sớm\nMềm mại thân thương\nHồng đào xinh xinh!"},
    ]},
  { id:"numbers", label:"Số đếm", icon:"🔢", color:"#E17055", grad:"linear-gradient(135deg,#FDCB6E,#e17055)",
    lessons:[
      {id:"n1",  num:1,  vi:"Số Một",  en:"One",   img:"☀️", objs:["🌟"],                                       rhyme:"Một cái mặt trời\nChiếu sáng cả ngày\nMột thôi một thôi\nĐếm một nào bé!"},
      {id:"n2",  num:2,  vi:"Số Hai",  en:"Two",   img:"👀", objs:["👁️","👁️"],                                 rhyme:"Hai con mắt đẹp\nNhìn khắp nơi nơi\nHai thôi hai thôi\nĐếm hai nào bé!"},
      {id:"n3",  num:3,  vi:"Số Ba",   en:"Three", img:"🍀", objs:["🍀","🍀","🍀"],                             rhyme:"Ba lá cỏ may\nXanh tươi đẹp lắm\nBa thôi ba thôi\nĐếm ba nào bé!"},
      {id:"n4",  num:4,  vi:"Số Bốn",  en:"Four",  img:"🦋", objs:["🦋","🦋","🦋","🦋"],                       rhyme:"Bốn con bướm bay\nXinh đẹp lắm thay\nBốn thôi bốn thôi\nĐếm bốn nào bé!"},
      {id:"n5",  num:5,  vi:"Số Năm",  en:"Five",  img:"🖐️",objs:["⭐","⭐","⭐","⭐","⭐"],                   rhyme:"Năm ngón tay xinh\nCủa bàn tay bé\nNăm thôi năm thôi\nĐếm năm nào bé!"},
      {id:"n6",  num:6,  vi:"Số Sáu",  en:"Six",   img:"🌸", objs:["🌸","🌸","🌸","🌸","🌸","🌸"],            rhyme:"Sáu bông hoa đẹp\nNở trong vườn nhà\nSáu thôi sáu thôi\nĐếm sáu nào bé!"},
      {id:"n7",  num:7,  vi:"Số Bảy",  en:"Seven", img:"🌈", objs:["🔴","🟠","🟡","🟢","🔵","🟣","🟤"],       rhyme:"Bảy màu cầu vồng\nSáng rực bầu trời\nBảy thôi bảy thôi\nĐếm bảy nào bé!"},
      {id:"n8",  num:8,  vi:"Số Tám",  en:"Eight", img:"🐙", objs:["🦵","🦵","🦵","🦵","🦵","🦵","🦵","🦵"],rhyme:"Tám chân bạch tuộc\nBơi lội tung tăng\nTám thôi tám thôi\nĐếm tám nào bé!"},
      {id:"n9",  num:9,  vi:"Số Chín", en:"Nine",  img:"🌙", objs:["⭐","⭐","⭐","⭐","⭐","⭐","⭐","⭐","⭐"],rhyme:"Chín ngôi sao sáng\nLấp lánh trời đêm\nChín thôi chín thôi\nĐếm chín nào bé!"},
      {id:"n10", num:10, vi:"Số Mười", en:"Ten",   img:"🎉", objs:["🎈","🎈","🎈","🎈","🎈","🎈","🎈","🎈","🎈","🎈"],rhyme:"Mười bóng bay bay\nĐủ màu sắc đẹp\nMười thôi mười thôi\nĐếm mười nào bé!"},
      {id:"n11", num:11, vi:"Mười một", en:"Eleven",     img:"🌟", rhyme:"Mười thêm một nữa\nLà mười một rồi\nĐếm tiếp đi bé\nMười một nào bé!"},
      {id:"n12", num:12, vi:"Mười hai", en:"Twelve",     img:"🦋", rhyme:"Mười hai tháng năm\nTrong một năm dài\nĐếm tiếp đi bé\nMười hai nào bé!"},
      {id:"n13", num:13, vi:"Mười ba",  en:"Thirteen",   img:"🌈", rhyme:"Mười thêm ba nữa\nLà mười ba rồi\nĐếm tiếp đi bé\nMười ba nào bé!"},
      {id:"n14", num:14, vi:"Mười bốn", en:"Fourteen",   img:"🌸", rhyme:"Mười thêm bốn nữa\nLà mười bốn rồi\nĐếm tiếp đi bé\nMười bốn nào bé!"},
      {id:"n15", num:15, vi:"Mười lăm", en:"Fifteen",    img:"🎯", rhyme:"Mười lăm đẹp lắm\nNửa của ba mươi\nĐếm tiếp đi bé\nMười lăm nào bé!"},
      {id:"n16", num:16, vi:"Mười sáu", en:"Sixteen",    img:"🎀", rhyme:"Mười thêm sáu nữa\nLà mười sáu rồi\nĐếm tiếp đi bé\nMười sáu nào bé!"},
      {id:"n17", num:17, vi:"Mười bảy", en:"Seventeen",  img:"🎪", rhyme:"Mười thêm bảy nữa\nLà mười bảy rồi\nĐếm tiếp đi bé\nMười bảy nào bé!"},
      {id:"n18", num:18, vi:"Mười tám", en:"Eighteen",   img:"🎨", rhyme:"Mười thêm tám nữa\nLà mười tám rồi\nĐếm tiếp đi bé\nMười tám nào bé!"},
      {id:"n19", num:19, vi:"Mười chín",en:"Nineteen",   img:"🎭", rhyme:"Mười thêm chín nữa\nLà mười chín rồi\nGần hai mươi rồi\nMười chín nào bé!"},
      {id:"n20", num:20, vi:"Hai mươi", en:"Twenty",     img:"🏆", rhyme:"Hai chục tròn tròn\nHai mươi đẹp lắm\nBé đếm giỏi lắm\nHai mươi nào bé!"},
      {id:"n21", num:21, vi:"Hai mốt",  en:"Twenty-one",   img:"🎯", rhyme:"Hai mươi mốt rồi\nHai mươi thêm một\nBé đếm giỏi quá\nHai mốt nào bé!"},
      {id:"n22", num:22, vi:"Hai hai",  en:"Twenty-two",   img:"🎨", rhyme:"Hai mươi hai rồi\nHai mươi thêm hai\nĐếm tiếp đi nhé\nHai hai nào bé!"},
      {id:"n23", num:23, vi:"Hai ba",   en:"Twenty-three", img:"🎭", rhyme:"Hai mươi ba rồi\nĐếm tiếp đi bé\nGiỏi giỏi giỏi quá\nHai ba nào bé!"},
      {id:"n24", num:24, vi:"Hai bốn",  en:"Twenty-four",  img:"🎁", rhyme:"Hai mươi bốn rồi\nMột ngày có hai bốn giờ\nĐếm tiếp đi bé\nHai bốn nào bé!"},
      {id:"n25", num:25, vi:"Hai lăm",  en:"Twenty-five",  img:"🎲", rhyme:"Hai mươi lăm rồi\nNửa của năm mươi\nĐếm tiếp đi bé\nHai lăm nào bé!"},
      {id:"n30", num:30, vi:"Ba mươi",  en:"Thirty",       img:"🌟", rhyme:"Ba chục đẹp lắm\nBa mươi đó nhé\nBé giỏi lắm rồi\nBa mươi nào bé!"},
      {id:"n40", num:40, vi:"Bốn mươi", en:"Forty",        img:"🎪", rhyme:"Bốn chục bốn mươi\nĐếm cao thế nhỉ\nBé thật là giỏi\nBốn mươi nào bé!"},
      {id:"n50", num:50, vi:"Năm mươi", en:"Fifty",        img:"🏅", rhyme:"Năm chục năm mươi\nNửa của trăm rồi\nBé giỏi lắm lắm\nNăm mươi nào bé!"},
      {id:"n60", num:60, vi:"Sáu mươi", en:"Sixty",        img:"⏰", rhyme:"Sáu chục sáu mươi\nMột giờ có sáu mươi phút\nĐếm cao đếm cao\nSáu mươi nào bé!"},
      {id:"n70", num:70, vi:"Bảy mươi", en:"Seventy",      img:"🎯", rhyme:"Bảy chục bảy mươi\nĐếm cao thật cao\nBé giỏi lắm rồi\nBảy mươi nào bé!"},
      {id:"n80", num:80, vi:"Tám mươi", en:"Eighty",       img:"🎉", rhyme:"Tám chục tám mươi\nĐếm gần đến trăm\nBé giỏi lắm lắm\nTám mươi nào bé!"},
      {id:"n90", num:90, vi:"Chín mươi",en:"Ninety",       img:"🎊", rhyme:"Chín chục chín mươi\nGần một trăm rồi\nBé đếm giỏi quá\nChín mươi nào bé!"},
      {id:"n100",num:100,vi:"Một trăm", en:"One hundred",  img:"💯", rhyme:"Một trăm một trăm\nMười chục là trăm\nBé giỏi tuyệt vời\nMột trăm nào bé!"},
    ]},
  { id:"alpha", label:"Chữ cái", icon:"🔤", color:"#0984E3", grad:"linear-gradient(135deg,#0984E3,#74b9ff)",
    lessons:[
      {id:"A",char:"A",vi:"Chữ A",en:"Apple",   img:"🍎",rhyme:"A là An toàn\nAnh ơi em ơi\nA như quả táo\nTròn trịa đỏ tươi!"},
      {id:"B",char:"B",vi:"Chữ B",en:"Butterfly",img:"🦋",rhyme:"B là Bướm xinh\nBay khắp vườn hoa\nB như con bướm\nĐôi cánh đẹp quá!"},
      {id:"C",char:"C",vi:"Chữ C",en:"Cat",     img:"🐱",rhyme:"C là Con mèo\nMeo meo kêu vang\nC như chú mèo\nMềm mại đáng yêu!"},
      {id:"D",char:"D",vi:"Chữ D",en:"Dog",     img:"🐶",rhyme:"D là con Chó\nGâu gâu vẫy đuôi\nD như chú chó\nNgoan ngoãn thân thiện!"},
      {id:"E",char:"E",vi:"Chữ E",en:"Elephant",img:"🐘",rhyme:"E là con Voi\nVòi dài khoẻ lắm\nE như chú voi\nTo lớn hiền lành!"},
      {id:"F",char:"F",vi:"Chữ F",en:"Fish",    img:"🐟",rhyme:"F là con Cá\nBơi trong nước mát\nF như chú cá\nVảy sáng lấp lánh!"},
      {id:"G",char:"G",vi:"Chữ G",en:"Grapes",  img:"🍇",rhyme:"G là chùm Nho\nTím ngắt ngọt lịm\nG như chùm nho\nXinh xắn đáng yêu!"},
      {id:"H",char:"H",vi:"Chữ H",en:"House",   img:"🏠",rhyme:"H là ngôi Nhà\nẤm áp yên vui\nH như ngôi nhà\nCủa gia đình mình!"},
      {id:"I",char:"I",vi:"Chữ I",en:"Ice cream",img:"🍦",rhyme:"I là cây Kem\nMát lạnh ngon lắm\nI như que kem\nThẳng đứng xinh xinh!"},
      {id:"K",char:"K",vi:"Chữ K",en:"Kite",    img:"🪁",rhyme:"K là con Diều\nBay cao vút vút\nK như con diều\nLượn khắp bầu trời!"},
      {id:"L",char:"L",vi:"Chữ L",en:"Lion",    img:"🦁",rhyme:"L là con Sư\nVua của rừng xanh\nL như sư tử\nOai hùng mạnh lắm!"},
      {id:"M",char:"M",vi:"Chữ M",en:"Moon",    img:"🌙",rhyme:"M là Mặt trăng\nSáng soi trời đêm\nM như vầng trăng\nTròn xinh lung linh!"},
      {id:"N",char:"N",vi:"Chữ N",en:"Nest",    img:"🪺",rhyme:"N là cái Tổ\nChim làm tổ xinh\nN như cái tổ\nTròn tròn ấm áp!"},
      {id:"O",char:"O",vi:"Chữ O",en:"Orange",  img:"🍊",rhyme:"O là quả Cam\nTròn tròn thơm lừng\nO như quả cam\nNgọt ngon mát lành!"},
      {id:"P",char:"P",vi:"Chữ P",en:"Pig",     img:"🐷",rhyme:"P là con Lợn\nỤt ịt đáng yêu\nP như chú lợn\nHồng hồng dễ thương!"},
      {id:"Q",char:"Q",vi:"Chữ Q",en:"Queen",   img:"👑",rhyme:"Q là Nữ hoàng\nĐội vương miện đẹp\nQ như vương miện\nSáng lấp lánh lắm!"},
      {id:"R",char:"R",vi:"Chữ R",en:"Rabbit",  img:"🐰",rhyme:"R là con Thỏ\nTai dài trắng muốt\nR như chú thỏ\nNhảy nhảy vui vẻ!"},
      {id:"S",char:"S",vi:"Chữ S",en:"Sun",     img:"☀️",rhyme:"S là Mặt trời\nTỏa sáng rực rỡ\nS như mặt trời\nẤm áp yêu thương!"},
      {id:"T",char:"T",vi:"Chữ T",en:"Tiger",   img:"🐯",rhyme:"T là con Hổ\nVằn vện oai hùng\nT như chú hổ\nChạy nhanh như gió!"},
      {id:"U",char:"U",vi:"Chữ U",en:"Umbrella",img:"☂️",rhyme:"U là cái Ô\nChe mưa che nắng\nU như cái ô\nRộng tròn xinh xinh!"},
      {id:"V",char:"V",vi:"Chữ V",en:"Violin",  img:"🎻",rhyme:"V là đàn Vi\nKéo lên tiếng hay\nV như đàn violin\nNhạc vang réo rắt!"},
      {id:"W",char:"W",vi:"Chữ W",en:"Whale",   img:"🐋",rhyme:"W là Cá voi\nBơi lội đại dương\nW như cá voi\nTo lớn hiền lành!"},
      {id:"X",char:"X",vi:"Chữ X",en:"X-ray",   img:"🩻",rhyme:"X như dấu nhân\nHai nét giao nhau\nX-ray nhìn xương\nBác sĩ dùng nha!"},
      {id:"Y",char:"Y",vi:"Chữ Y",en:"Yak",     img:"🐂",rhyme:"Y là con Bò\nTây Tạng xa xôi\nY như chú bò\nTo khỏe chăm chỉ!"},
      {id:"Z",char:"Z",vi:"Chữ Z",en:"Zebra",   img:"🦓",rhyme:"Z là Ngựa vằn\nSọc đen sọc trắng\nZ như ngựa vằn\nĐẹp lạ lắm nha!"},
    ]},
  { id:"objects", label:"Đồ vật", icon:"🏠", color:"#E84393", grad:"linear-gradient(135deg,#E84393,#fd79a8)",
    lessons:[
      {id:"ball",    vi:"Quả bóng",   en:"Ball",     img:"⚽", rhyme:"Bóng tròn lăn lăn\nĐá vào đá ra\nChơi cùng bạn bè\nBóng ơi bóng ơi!"},
      {id:"book",    vi:"Quyển sách", en:"Book",     img:"📚", rhyme:"Sách vở trang trắng\nChữ đẹp ngay hàng\nĐọc sách học giỏi\nSách ơi sách ơi!"},
      {id:"pencil",  vi:"Bút chì",    en:"Pencil",   img:"✏️", rhyme:"Bút chì dài dài\nVẽ tranh tô màu\nHọc bài viết chữ\nBút chì xinh nha!"},
      {id:"cup",     vi:"Cái cốc",    en:"Cup",      img:"🥤", rhyme:"Cốc xinh tròn tròn\nĐựng nước uống mát\nNhớ uống đủ nước\nCốc ơi cốc ơi!"},
      {id:"chair",   vi:"Cái ghế",    en:"Chair",    img:"🪑", rhyme:"Ghế bốn chân vững\nNgồi học ngoan nha\nLưng thẳng ngồi đẹp\nGhế ơi ghế ơi!"},
      {id:"bag",     vi:"Cái túi",    en:"Bag",      img:"🎒", rhyme:"Túi đựng đồ đi\nĐi học đi chơi\nKéo dây kéo lên\nTúi ơi túi ơi!"},
      {id:"clock",   vi:"Đồng hồ",    en:"Clock",    img:"🕐", rhyme:"Đồng hồ kim quay\nTích tắc tích tắc\nBiết mấy giờ rồi\nĐồng hồ thật hay!"},
      {id:"lamp",    vi:"Cái đèn",    en:"Lamp",     img:"💡", rhyme:"Đèn sáng lung linh\nChiếu sáng phòng ta\nBật lên bật lên\nĐèn ơi đèn ơi!"},
      {id:"umbrella",vi:"Cái ô",      en:"Umbrella", img:"☂️", rhyme:"Ô che mưa rơi\nChe nắng mùa hè\nMở ra thật rộng\nÔ ơi ô ơi!"},
      {id:"car2",    vi:"Xe ô tô",    en:"Car",      img:"🚗", rhyme:"Ô tô bíp bíp\nChạy trên đường to\nVroom vroom nhanh lắm\nÔ tô ơi ơi!"},
      {id:"bike",    vi:"Xe đạp",     en:"Bicycle",  img:"🚲", rhyme:"Xe đạp hai bánh\nĐạp đi đạp lại\nVui vui khỏe lắm\nXe đạp ơi ơi!"},
      {id:"phone",   vi:"Điện thoại", en:"Phone",    img:"📱", rhyme:"Điện thoại vuông xinh\nGọi cho bố mẹ\nNhớ đừng dùng nhiều\nĐiện thoại ơi ơi!"},
      {id:"ball2",   vi:"Bóng bay",   en:"Balloon",  img:"🎈", rhyme:"Bóng bay tròn tròn\nBay lên bay lên\nXanh đỏ tím vàng\nBóng bay đẹp quá!"},
      {id:"kite",    vi:"Con diều",   en:"Kite",     img:"🪁", rhyme:"Diều bay trên cao\nGió đưa lên trời\nBé cầm dây chắc\nDiều ơi diều ơi!"},
      {id:"drum",    vi:"Cái trống",  en:"Drum",     img:"🥁", rhyme:"Trống đánh tùng tùng\nBum bum bum bum\nNhạc vang rộn ràng\nTrống ơi trống ơi!"},
      {id:"piano",   vi:"Đàn piano",  en:"Piano",    img:"🎹", rhyme:"Piano phím đen trắng\nNhạc hay du dương\nNgón tay nhảy múa\nPiano tuyệt vời!"},
      {id:"guitar",  vi:"Đàn ghita",  en:"Guitar",   img:"🎸", rhyme:"Ghita sáu dây\nGảy lên tiếng hay\nNhạc vui nhạc buồn\nGhita đáng yêu!"},
      {id:"camera",  vi:"Máy ảnh",    en:"Camera",   img:"📷", rhyme:"Máy ảnh tách tách\nGhi lại khoảnh khắc\nKỷ niệm đẹp xinh\nMáy ảnh tài tình!"},
      {id:"tv",      vi:"TV",         en:"TV",       img:"📺", rhyme:"TV chiếu phim hay\nXem nhiều chương trình\nNhớ đừng xem lâu\nTV vui ngộ nghĩnh!"},
      {id:"computer",vi:"Máy tính",   en:"Computer", img:"💻", rhyme:"Máy tính thông minh\nLàm việc học bài\nBàn phím gõ gõ\nMáy tính tài giỏi!"},
      {id:"watch",   vi:"Đồng hồ tay",en:"Watch",    img:"⌚", rhyme:"Đồng hồ đeo tay\nXem giờ tiện lợi\nTích tắc tích tắc\nĐồng hồ xinh xinh!"},
      {id:"key",     vi:"Chìa khóa",  en:"Key",      img:"🔑", rhyme:"Chìa khóa nhỏ xinh\nMở cửa mở khóa\nGiữ gìn cẩn thận\nChìa khóa quan trọng!"},
      {id:"gift",    vi:"Hộp quà",    en:"Gift",     img:"🎁", rhyme:"Hộp quà xinh xắn\nDây nơ đỏ tươi\nMở ra hồi hộp\nHộp quà vui quá!"},
      {id:"candle",  vi:"Cây nến",    en:"Candle",   img:"🕯️", rhyme:"Nến cháy lung linh\nÁnh sáng dịu dàng\nThổi tắt một lần\nNến đẹp lắm nha!"},
      {id:"glasses", vi:"Kính",       en:"Glasses",  img:"👓", rhyme:"Kính đeo lên mắt\nNhìn rõ hơn nhiều\nGiúp đôi mắt khỏe\nKính ơi kính ơi!"},
      {id:"hat",     vi:"Cái mũ",     en:"Hat",      img:"🎩", rhyme:"Mũ đội lên đầu\nChe nắng che mưa\nĐủ kiểu đủ màu\nMũ ơi mũ ơi!"},
      {id:"shoes",   vi:"Đôi giày",   en:"Shoes",    img:"👟", rhyme:"Giày xinh đôi đôi\nMang vào đi bộ\nChạy nhảy thoải mái\nGiày ơi giày ơi!"},
      {id:"shirt",   vi:"Áo",         en:"Shirt",    img:"👕", rhyme:"Áo đẹp nhiều màu\nMặc vào thật xinh\nẤm áp thân thương\nÁo ơi áo ơi!"},
      {id:"flower",  vi:"Bông hoa",   en:"Flower",   img:"🌷", rhyme:"Hoa nở thật đẹp\nMàu sắc rực rỡ\nTỏa hương thơm ngát\nHoa ơi hoa ơi!"},
      {id:"tree",    vi:"Cây xanh",   en:"Tree",     img:"🌳", rhyme:"Cây xanh thẳng đứng\nCho bóng mát rượi\nLá xanh đung đưa\nCây ơi cây ơi!"},
    ]},
  { id:"food", label:"Thức ăn", icon:"🍱", color:"#FF9F43", grad:"linear-gradient(135deg,#FF9F43,#fdcb6e)",
    lessons:[
      {id:"rice2",   vi:"Cơm",        en:"Rice",     img:"🍚", rhyme:"Cơm trắng dẻo thơm\nĂn vào no bụng\nBé ăn ngoan nha\nCơm ơi cơm ơi!"},
      {id:"pho2",    vi:"Phở",        en:"Pho",      img:"🍜", rhyme:"Phở nóng thơm lừng\nMón ăn Việt Nam\nHút hết húp sạch\nPhở ơi phở ơi!"},
      {id:"bread2",  vi:"Bánh mì",    en:"Bread",    img:"🥖", rhyme:"Bánh mì giòn tan\nNóng hổi thơm phức\nCắn một cái ngon\nBánh mì ơi ơi!"},
      {id:"milk2",   vi:"Sữa",        en:"Milk",     img:"🥛", rhyme:"Sữa trắng ngon lành\nUống mỗi buổi sáng\nLớn cao khỏe mạnh\nSữa ơi sữa ơi!"},
      {id:"egg2",    vi:"Quả trứng",  en:"Egg",      img:"🥚", rhyme:"Trứng gà tròn tròn\nLuộc lên ăn ngon\nBổ lắm bổ lắm\nTrứng ơi trứng ơi!"},
      {id:"noodle2", vi:"Mì sợi",     en:"Noodle",   img:"🍝", rhyme:"Mì sợi dài dài\nXào lên thơm ngon\nBé ăn no bụng\nMì ơi mì ơi!"},
      {id:"cake2",   vi:"Bánh kem",   en:"Cake",     img:"🎂", rhyme:"Bánh kem sinh nhật\nNến sáng thổi đi\nÚc a ước gì\nBánh kem ngon quá!"},
      {id:"icecream2",vi:"Kem lạnh",  en:"Ice cream",img:"🍦", rhyme:"Kem mát lạnh lắm\nNgọt ngào thơm ngon\nMùa hè ăn ngon\nKem ơi kem ơi!"},
      {id:"cookie",  vi:"Bánh quy",   en:"Cookie",   img:"🍪", rhyme:"Bánh quy giòn tan\nNgọt ngào thơm lừng\nNgậm vào tan ngay\nBánh quy ngon quá!"},
      {id:"pizza2",  vi:"Pizza",      en:"Pizza",    img:"🍕", rhyme:"Pizza tròn to\nPhô mai béo ngậy\nCắn một miếng ngon\nPizza ơi ơi!"},
      {id:"soup2",   vi:"Canh",       en:"Soup",     img:"🥣", rhyme:"Canh nóng sóng sánh\nHúp vào thơm ngon\nBổ dưỡng lắm lắm\nCanh ơi canh ơi!"},
      {id:"sandwich",vi:"Bánh sandwich",en:"Sandwich",img:"🥪",rhyme:"Bánh sandwich ngon\nKẹp đủ thứ nha\nĂn vào no bụng\nBánh ơi bánh ơi!"},
      {id:"hotdog",  vi:"Xúc xích",   en:"Hot dog",  img:"🌭", rhyme:"Xúc xích nóng hổi\nDài dài thơm ngon\nKẹp bánh mì giòn\nXúc xích ngon quá!"},
      {id:"taco",    vi:"Bánh taco",  en:"Taco",     img:"🌮", rhyme:"Taco gập đôi\nNhân đủ màu sắc\nCắn một miếng giòn\nTaco ngon quá!"},
      {id:"corn",    vi:"Bắp ngô",    en:"Corn",     img:"🌽", rhyme:"Bắp vàng ngọt ngào\nLuộc lên thơm phức\nCắn từng hạt ngon\nBắp ơi bắp ơi!"},
      {id:"burger",  vi:"Bánh hamburger",en:"Burger", img:"🍔", rhyme:"Hamburger to to\nKẹp đủ rau thịt\nĂn vào no nê\nHamburger ngon quá!"},
      {id:"fries",   vi:"Khoai tây chiên",en:"Fries",  img:"🍟", rhyme:"Khoai chiên giòn rụm\nVàng ươm thơm phức\nCắn từng miếng ngon\nKhoai chiên ngon quá!"},
      {id:"chicken", vi:"Gà",         en:"Chicken",   img:"🍗", rhyme:"Gà rán giòn rụm\nTẩm bột thơm lừng\nBé thích ăn lắm\nGà rán ngon quá!"},
      {id:"fish2",   vi:"Cá",         en:"Fish",      img:"🐟", rhyme:"Cá tươi ngon lành\nĂn nhiều bổ óc\nGiúp bé thông minh\nCá ơi cá ơi!"},
      {id:"shrimp",  vi:"Tôm",        en:"Shrimp",    img:"🦐", rhyme:"Tôm đỏ tươi roi\nHấp lên thơm ngon\nGiòn giòn ngọt ngọt\nTôm ngon ngon lắm!"},
      {id:"candy",   vi:"Kẹo",        en:"Candy",     img:"🍬", rhyme:"Kẹo ngọt nhiều màu\nGói gói bóc bóc\nĐừng ăn quá nhiều\nKẹo vui đáng yêu!"},
      {id:"choco",   vi:"Sô cô la",   en:"Chocolate", img:"🍫", rhyme:"Sô cô la nâu\nNgọt đắng quyến rũ\nBẻ thành từng thanh\nSô cô la tuyệt!"},
      {id:"donut",   vi:"Bánh donut", en:"Donut",     img:"🍩", rhyme:"Donut tròn tròn\nỞ giữa có lỗ\nNgọt ngọt mềm mềm\nDonut ngon quá!"},
      {id:"sushi",   vi:"Sushi",      en:"Sushi",     img:"🍣", rhyme:"Sushi cơm cuộn\nMón ăn Nhật Bản\nCá tươi rong biển\nSushi đặc biệt!"},
      {id:"dumpling",vi:"Bánh bao",   en:"Dumpling",  img:"🥟", rhyme:"Bánh bao nhân thịt\nHấp lên nóng hổi\nMềm mềm thơm ngon\nBánh bao bổ dưỡng!"},
      {id:"honey",   vi:"Mật ong",    en:"Honey",     img:"🍯", rhyme:"Mật ong vàng óng\nNgọt thơm dịu nhẹ\nDo ong làm ra\nMật ong quý lắm!"},
      {id:"butter",  vi:"Bơ",         en:"Butter",    img:"🧈", rhyme:"Bơ vàng béo ngậy\nPhết lên bánh mì\nThơm ngon đậm đà\nBơ ơi bơ ơi!"},
      {id:"cheese",  vi:"Phô mai",    en:"Cheese",    img:"🧀", rhyme:"Phô mai vàng tươi\nBéo ngậy thơm phức\nĂn ngon đến vậy\nPhô mai tuyệt vời!"},
      {id:"salad",   vi:"Rau xà lách",en:"Salad",     img:"🥗", rhyme:"Xà lách xanh tươi\nGiòn ngon bổ dưỡng\nĂn nhiều rau xanh\nXà lách khỏe mạnh!"},
      {id:"juice",   vi:"Nước ép",    en:"Juice",     img:"🧃", rhyme:"Nước ép trái cây\nNgọt mát thơm ngon\nUống vào khỏe lắm\nNước ép tươi tốt!"},
    ]},
  { id:"shapes", label:"Hình dạng", icon:"🔷", color:"#00CEC9", grad:"linear-gradient(135deg,#00CEC9,#55efc4)",
    lessons:[
      {id:"circle",  vi:"Hình tròn",    en:"Circle",    img:"⭕",rhyme:"Tròn tròn tròn ơi\nNhư vầng trăng sáng\nNhư bánh xe lăn\nHình tròn đẹp quá!"},
      {id:"square",  vi:"Hình vuông",   en:"Square",    img:"⬛",rhyme:"Vuông vuông vuông ơi\nBốn góc bằng nhau\nNhư hộp quà xinh\nHình vuông đẹp quá!"},
      {id:"triangle",vi:"Tam giác",     en:"Triangle",  img:"🔺",rhyme:"Ba cạnh ba góc\nNhọn hoắt thẳng thẳng\nNhư núi cao vời\nTam giác đẹp quá!"},
      {id:"star",    vi:"Ngôi sao",     en:"Star",      img:"⭐",rhyme:"Sao sáng lấp lánh\nNăm cánh nhọn xinh\nLấp lánh trên trời\nNgôi sao đẹp quá!"},
      {id:"heart",   vi:"Trái tim",     en:"Heart",     img:"❤️",rhyme:"Trái tim đỏ tươi\nYêu thương chan chứa\nBé yêu bố mẹ\nTrái tim đẹp quá!"},
      {id:"diamond", vi:"Hình thoi",    en:"Diamond",   img:"💎",rhyme:"Thoi thoi bốn cạnh\nNhư viên kim cương\nSáng long lanh lắm\nHình thoi đẹp quá!"},
      {id:"rect",    vi:"Hình chữ nhật",en:"Rectangle", img:"🚪",rhyme:"Dài hơn hình vuông\nBốn góc vuông vắn\nNhư cánh cửa nhà\nHình chữ nhật đẹp!"},
      {id:"oval",    vi:"Hình bầu dục", en:"Oval",      img:"🥚",rhyme:"Dài dài tròn tròn\nNhư quả trứng xinh\nBầu dục bầu dục\nHình bầu dục đẹp!"},
      {id:"pentagon",vi:"Ngũ giác",     en:"Pentagon",  img:"⬠", rhyme:"Năm cạnh năm góc\nĐều nhau thẳng tắp\nNhư tổ ong xinh\nNgũ giác đẹp quá!"},
      {id:"hexagon", vi:"Lục giác",     en:"Hexagon",   img:"🔷",rhyme:"Sáu cạnh sáu góc\nTổ ong xếp khít\nNhỏ xinh ghép lại\nLục giác đẹp quá!"},
      {id:"arrow",   vi:"Mũi tên",      en:"Arrow",     img:"➡️",rhyme:"Mũi tên chỉ đường\nPhải trái lên xuống\nDài nhọn xinh xinh\nMũi tên đẹp quá!"},
      {id:"cross",   vi:"Dấu cộng",     en:"Cross",     img:"➕",rhyme:"Dấu cộng thêm vào\nCộng lại nhiều hơn\nTrong toán học vui\nDấu cộng xinh nha!"},
      {id:"halfcircle",vi:"Nửa vòng tròn",en:"Semicircle",img:"🌈",rhyme:"Nửa vòng tròn ơi\nNhư cầu vồng đẹp\nCong cong xinh xinh\nNửa tròn đẹp quá!"},
      {id:"cylinder",vi:"Hình trụ",     en:"Cylinder",  img:"🥫",rhyme:"Hình trụ tròn dài\nNhư hộp đồ hộp\nLăn lăn vui vẻ\nHình trụ đẹp quá!"},
      {id:"cube",    vi:"Hình lập phương",en:"Cube",    img:"📦",rhyme:"Sáu mặt đều nhau\nNhư hộp quà xinh\nXếp lên xếp xuống\nHình hộp đẹp quá!"},
      {id:"sphere",  vi:"Hình cầu",     en:"Sphere",    img:"🌍",rhyme:"Cầu tròn xinh xinh\nNhư trái đất xanh\nLăn lăn vui vẻ\nHình cầu đẹp quá!"},
      {id:"cone",    vi:"Hình nón",     en:"Cone",      img:"🍦",rhyme:"Nón nhọn nhọn nhọn\nNhư cây kem que\nĐầu nhỏ đáy to\nHình nón ngộ quá!"},
      {id:"pyramid", vi:"Hình chóp",    en:"Pyramid",   img:"🔺",rhyme:"Chóp cao nhọn nhọn\nNhư kim tự tháp\nĐáy to đỉnh nhỏ\nHình chóp uy nghi!"},
      {id:"oct",     vi:"Bát giác",     en:"Octagon",   img:"🛑",rhyme:"Tám cạnh tám góc\nNhư biển báo dừng\nMàu đỏ tươi tươi\nBát giác đẹp lắm!"},
      {id:"crescent",vi:"Hình lưỡi liềm",en:"Crescent",  img:"🌙",rhyme:"Lưỡi liềm cong cong\nNhư trăng đầu tháng\nMỏng nhẹ xinh xinh\nLưỡi liềm dịu dàng!"},
      {id:"trap",    vi:"Hình thang",   en:"Trapezoid", img:"🧱",rhyme:"Hình thang đặc biệt\nHai cạnh song song\nHai cạnh khác nhau\nHình thang lạ quá!"},
      {id:"parallelogram",vi:"Bình hành",en:"Parallelogram",img:"▰",rhyme:"Bình hành nghiêng nghiêng\nBốn cạnh song song\nĐối nhau bằng nhau\nBình hành xinh quá!"},
      {id:"hexagram",vi:"Sao sáu cánh", en:"Star of David",img:"✡️",rhyme:"Sao sáu cánh đẹp\nHai tam giác chồng\nSáng lấp lánh quá\nSao sáu cánh xinh!"},
      {id:"infinity",vi:"Vô cực",       en:"Infinity",   img:"♾️",rhyme:"Vô cực nằm ngang\nNhư số tám ngủ\nKhông bao giờ hết\nVô cực kỳ lạ!"},
      {id:"plus",    vi:"Hình chữ thập", en:"Plus sign",  img:"✚",rhyme:"Chữ thập đẹp lắm\nNhư biểu tượng y\nGiúp đỡ mọi người\nChữ thập tình thương!"},
    ]},
];


// ══════════════════════════════════════════════════════════════
//  PHẦN 2: HỆ THỐNG ĐỘ TUỔI 3 CẤP
// ══════════════════════════════════════════════════════════════
const AGE_GROUPS = {
  toddler: {
    id:"toddler", label:"2–3 tuổi", icon:"🍼", color:"#FF8E53",
    desc:"Nhận biết hình ảnh đơn giản",
    sessionSize: 6,        // ít bài hơn vì tập trung kém
    enabledTopics: ["animals","fruits","colors"],  // chỉ 3 chủ đề
    skipChars: true,       // bỏ chữ cái
    bigImage: true,        // hình to hơn
  },
  preschool: {
    id:"preschool", label:"3–5 tuổi", icon:"🌱", color:"#00B894",
    desc:"Học chữ, số, từ vựng",
    sessionSize: 10,
    enabledTopics: ["animals","fruits","colors","numbers","alpha","shapes","objects","food"],
    skipChars: false,
    bigImage: false,
  },
  kinder: {
    id:"kinder", label:"5–6 tuổi", icon:"🎒", color:"#6C5CE7",
    desc:"Ghép vần, cộng trừ đơn giản",
    sessionSize: 12,
    enabledTopics: ["animals","fruits","colors","numbers","alpha","shapes","objects","food"],
    skipChars: false,
    bigImage: false,
    showMath: true,        // thêm bài cộng/trừ
  },
};

// ══════════════════════════════════════════════════════════════
//  PHẦN 7: AI NHẸ — Theo dõi bài sai và ưu tiên ôn lại
// ══════════════════════════════════════════════════════════════
const Stats = {
  // Tăng số lần đúng/sai cho 1 bài
  record(lessonId, ok) {
    const data = S.get("stats", {});
    if (!data[lessonId]) data[lessonId] = { correct:0, wrong:0, last:0 };
    if (ok) data[lessonId].correct++;
    else    data[lessonId].wrong++;
    data[lessonId].last = Date.now();
    S.set("stats", data);
  },

  // Lấy điểm "ưu tiên ôn" cho 1 bài (cao = nên ôn lại)
  priority(lessonId) {
    const data = S.get("stats", {});
    const s = data[lessonId];
    if (!s) return 0.5; // bài mới: ưu tiên trung bình
    const total = s.correct + s.wrong;
    if (total === 0) return 0.5;
    const errorRate = s.wrong / total;
    const daysSince = (Date.now() - s.last) / (1000*60*60*24);
    return errorRate * 0.7 + Math.min(daysSince/7, 1) * 0.3;
  },

  // Sắp xếp lessons theo ưu tiên — bài hay sai lên đầu
  sortByPriority(lessons) {
    return lessons.slice().sort((a,b) => Stats.priority(b.id) - Stats.priority(a.id));
  },

  // Cho parent dashboard: tổng số bài đã học
  totalStudied() {
    return Object.keys(S.get("stats", {})).length;
  },
  totalCorrect() {
    const data = S.get("stats", {});
    return Object.values(data).reduce((sum, s) => sum + (s.correct||0), 0);
  },
  totalWrong() {
    const data = S.get("stats", {});
    return Object.values(data).reduce((sum, s) => sum + (s.wrong||0), 0);
  },

  // Top bài hay sai nhất (cho parent)
  weakestLessons(allLessons, limit=5) {
    const data = S.get("stats", {});
    return allLessons
      .filter(l => data[l.id] && data[l.id].wrong > 0)
      .sort((a,b) => (data[b.id]?.wrong||0) - (data[a.id]?.wrong||0))
      .slice(0, limit);
  },
};

// ── Tracking thời gian học (cho parent) ──
const TimeTracker = {
  startSession() { S.set("sessionStart", Date.now()); },
  endSession() {
    const start = S.get("sessionStart", 0); if (!start) return;
    const elapsed = Math.floor((Date.now() - start) / 1000);
    const today = new Date().toISOString().split("T")[0];
    const log = S.get("timeLog", {});
    log[today] = (log[today] || 0) + elapsed;
    S.set("timeLog", log);
    S.set("sessionStart", 0);
  },
  todayMinutes() {
    const today = new Date().toISOString().split("T")[0];
    return Math.round((S.get("timeLog", {})[today] || 0) / 60);
  },
  weekMinutes() {
    const log = S.get("timeLog", {});
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      total += log[key] || 0;
    }
    return Math.round(total / 60);
  },
};



// ══════════════════════════════════════════════════════════════
//  CSS
// ══════════════════════════════════════════════════════════════
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@700;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Nunito',sans-serif;background:#f0f4f8;}
  .F{font-family:'Fredoka One',cursive;}
  .B{cursor:pointer;border:none;outline:none;-webkit-tap-highlight-color:transparent;user-select:none;transition:transform .12s cubic-bezier(.34,1.56,.64,1),opacity .1s;}
  .B:active{transform:scale(0.85)!important;opacity:0.85;}

  @keyframes popM   {0%{transform:scale(0.2);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
  @keyframes upM    {from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes pulseM {0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
  @keyframes shakeM {0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
  @keyframes wgl    {0%,100%{transform:rotate(0)scale(1)}35%{transform:rotate(-12deg)scale(1.15)}65%{transform:rotate(12deg)scale(1.15)}}
  @keyframes fall   {to{transform:translateY(130vh)rotate(540deg);opacity:0}}
  @keyframes glow   {0%,100%{box-shadow:0 6px 24px rgba(0,0,0,.15)}50%{box-shadow:0 10px 40px rgba(0,0,0,.3)}}
  @keyframes bounceM {0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
  @keyframes spinM   {0%{transform:rotate(0)scale(1)}50%{transform:rotate(20deg)scale(1.1)}100%{transform:rotate(0)scale(1)}}
  @keyframes tiltM   {0%,100%{transform:rotate(0)}50%{transform:rotate(-10deg)}}

  .pop{animation:popM .42s cubic-bezier(.34,1.56,.64,1) both;}
  .up{animation:upM .35s ease both;}
  .pulseM{animation:pulseM 1.8s ease-in-out infinite;}
  .shake{animation:shakeM .4s ease;}
  .wgl{animation:wgl .5s ease;}
  .glow{animation:glow 1.6s ease-in-out infinite;}
  .bounceM{animation:bounceM 1.2s ease-in-out infinite;}
  .spinM{animation:spinM 1.5s ease-in-out infinite;}
  .tiltM{animation:tiltM 1.5s ease-in-out infinite;}

  .pbar{height:12px;background:rgba(255,255,255,.35);border-radius:99px;overflow:hidden;}
  .pfill{height:100%;background:white;border-radius:99px;transition:width .6s cubic-bezier(.34,1.56,.64,1);}

  canvas{touch-action:none;}
`;

// ── Mascot ──
function Mascot({ mood = "happy", message, size = 56 }) {
  const A = { happy:"pulseM", excited:"bounceM", cheer:"spinM", thinking:"tiltM", sleepy:"", wow:"bounceM" }[mood] || "pulseM";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div className={A} style={{ fontSize:size, lineHeight:1, filter:"drop-shadow(0 4px 12px rgba(0,0,0,.2))" }}>🦉</div>
      {message && (
        <div style={{ background:"white", borderRadius:16, padding:"8px 14px", fontSize:14, fontWeight:700, color:"#444", boxShadow:"0 4px 16px rgba(0,0,0,.12)", maxWidth:200, lineHeight:1.3, position:"relative" }}>
          <div style={{ position:"absolute", left:-8, top:14, width:0, height:0, borderTop:"8px solid transparent", borderBottom:"8px solid transparent", borderRight:"10px solid white" }}/>
          {message}
        </div>
      )}
    </div>
  );
}

// ── HomeButton ──
function HomeButton({ onHome }) {
  const [c, setC] = useState(false);
  function tap() {
    buzz(15); sfx.tap();
    if (!c) { setC(true); setTimeout(()=>setC(false), 2500); }
    else onHome();
  }
  return (
    <button className="B" onClick={tap} style={{
      position:"absolute", top:14, left:14, zIndex:11,
      background: c ? "white" : "rgba(255,255,255,.28)", backdropFilter:"blur(8px)",
      borderRadius:99, padding: c ? "6px 14px" : "6px 10px",
      fontSize:14, fontWeight:900, color: c ? "#666" : "white",
      display:"flex", alignItems:"center", gap:6,
      boxShadow: c ? "0 4px 16px rgba(0,0,0,.15)" : "none", transition:"all .25s",
    }}>🏠 {c && <span style={{fontSize:12}}>Về trang chủ?</span>}</button>
  );
}

// ── Confetti ──
function Confetti() {
  const P = Array.from({length:26},(_,i)=>({
    id:i, left:Math.random()*100, delay:Math.random()*.7, dur:1.4+Math.random()*.8,
    e:["🌟","🎉","⭐","🎊","✨","🏆","💫","🎈","💖","🎀"][i%10], sz:16+Math.random()*14,
  }));
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:999,overflow:"hidden"}}>
      {P.map(p=>(
        <div key={p.id} style={{position:"absolute",left:`${p.left}%`,top:-50,fontSize:p.sz,animation:`fall ${p.dur}s ease-in ${p.delay}s forwards`}}>{p.e}</div>
      ))}
    </div>
  );
}

// ── ProgressDots ──
function ProgressDots({ current, total, color }) {
  return (
    <div style={{display:"flex", gap:6, justifyContent:"center"}}>
      {Array.from({length:total}).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 14 : 10, height: i === current ? 14 : 10,
          borderRadius:"50%",
          background: i < current ? color : i === current ? "white" : "rgba(255,255,255,.4)",
          border: i === current ? `2px solid ${color}` : "none",
          transition: "all .3s",
        }}/>
      ))}
    </div>
  );
}



// ══════════════════════════════════════════════════════════════
//  AGE SELECT — Chọn độ tuổi lần đầu
// ══════════════════════════════════════════════════════════════
function AgeSelect({ onPick }) {
  return (
    <div style={{background:"linear-gradient(160deg,#667eea,#764ba2)", minHeight:"100vh", padding:"40px 20px"}}>
      <div style={{textAlign:"center", marginBottom:24}}>
        <div className="pulseM" style={{fontSize:70, marginBottom:10}}>🦉</div>
        <h1 className="F" style={{color:"white", fontSize:28, textShadow:"0 3px 14px rgba(0,0,0,.3)"}}>
          Bé bao nhiêu tuổi rồi?
        </h1>
        <p style={{color:"rgba(255,255,255,.85)", fontSize:14, marginTop:8}}>
          Chọn độ tuổi để Tony chuẩn bị bài phù hợp nhé!
        </p>
      </div>

      <div style={{display:"flex", flexDirection:"column", gap:14, maxWidth:380, margin:"0 auto"}}>
        {Object.values(AGE_GROUPS).map((g, i) => (
          <button key={g.id} className="B pop" onClick={() => { buzz(15); sfx.tap(); S.set("ageGroup", g.id); onPick(g.id); }}
            style={{
              animationDelay:`${i*.1}s`, background:"white", borderRadius:20,
              border:`3px solid ${g.color}66`, padding:"18px 20px",
              display:"flex", alignItems:"center", gap:14,
              boxShadow:"0 6px 24px rgba(0,0,0,.15)", textAlign:"left",
            }}>
            <div style={{
              width:60, height:60, borderRadius:18,
              background:`linear-gradient(135deg, ${g.color}33, ${g.color}66)`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, flexShrink:0,
            }}>{g.icon}</div>
            <div style={{flex:1}}>
              <div className="F" style={{fontSize:22, color:g.color}}>{g.label}</div>
              <div style={{fontSize:13, color:"#666", marginTop:2}}>{g.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  HOME SCREEN — với nút phụ huynh + chế độ học cùng bố mẹ
// ══════════════════════════════════════════════════════════════
function HomeScreen({ onStart, kidName, ageGroup, onParent, onChangeAge, withParent, setWithParent }) {
  const enabled = AGE_GROUPS[ageGroup].enabledTopics;
  const topics = TOPICS.filter(t => enabled.includes(t.id));

  return (
    <div style={{background:"linear-gradient(160deg,#667eea,#764ba2,#f093fb)", padding:"20px 16px 44px", minHeight:"100vh", position:"relative"}}>
      {/* Nút phụ huynh — góc phải */}
      <button className="B" onClick={() => { buzz(15); sfx.tap(); onParent(); }} style={{
        position:"absolute", top:14, right:14, zIndex:10,
        background:"rgba(255,255,255,.22)", borderRadius:99,
        padding:"6px 12px", fontSize:13, fontWeight:700, color:"white",
        backdropFilter:"blur(8px)",
      }}>👨‍👩 Phụ huynh</button>

      {/* Đổi độ tuổi — góc trái */}
      <button className="B" onClick={() => { buzz(10); sfx.tap(); onChangeAge(); }} style={{
        position:"absolute", top:14, left:14, zIndex:10,
        background:"rgba(255,255,255,.22)", borderRadius:99,
        padding:"6px 12px", fontSize:13, fontWeight:700, color:"white",
        backdropFilter:"blur(8px)",
      }}>{AGE_GROUPS[ageGroup].icon} {AGE_GROUPS[ageGroup].label}</button>

      <div style={{display:"flex", justifyContent:"center", marginTop:50, marginBottom:14}}>
        <Mascot mood="excited" message={`Chào ${kidName}!`} size={70}/>
      </div>

      <div style={{textAlign:"center", marginBottom:18}}>
        <h1 className="F" style={{fontSize:30, color:"white", textShadow:"0 3px 14px rgba(0,0,0,.3)"}}>
          Hôm nay học gì? 👇
        </h1>
      </div>

      {/* Toggle: Học cùng bố mẹ */}
      <div style={{maxWidth:380, margin:"0 auto 16px", display:"flex", justifyContent:"center"}}>
        <button className="B" onClick={() => { buzz(10); setWithParent(!withParent); }} style={{
          background: withParent ? "white" : "rgba(255,255,255,.22)",
          color: withParent ? "#6C5CE7" : "white",
          borderRadius:99, padding:"8px 18px", fontSize:13, fontWeight:700,
          border:"2px solid rgba(255,255,255,.4)",
          display:"flex", alignItems:"center", gap:6,
        }}>
          {withParent ? "✅" : "⬜"} 👨‍👩 Học cùng bố mẹ
        </button>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, maxWidth:420, margin:"0 auto"}}>
        {topics.map((t,i)=>(
          <button key={t.id} className="B pop"
            style={{animationDelay:`${i*.07}s`, background:"white", borderRadius:22,
              border:`3px solid ${t.color}44`, padding:"16px 10px",
              display:"flex", flexDirection:"column", alignItems:"center", gap:6,
              boxShadow:"0 4px 18px rgba(0,0,0,.1)", width:"100%"}}
            onClick={()=>{ buzz(15); sfx.tap(); onStart(t); }}>
            <div style={{width:50, height:50, borderRadius:14,
              background:`linear-gradient(135deg,${t.color}33,${t.color}66)`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:26}}>
              {t.icon}
            </div>
            <div className="F" style={{fontSize:16, color:t.color}}>{t.label}</div>
            <div style={{fontSize:11, color:"#aaa"}}>{t.lessons.length} bài</div>
          </button>
        ))}
      </div>

      <p style={{textAlign:"center", color:"rgba(255,255,255,.55)", fontSize:12, marginTop:18}}>
        Mỗi lần học {AGE_GROUPS[ageGroup].sessionSize} bài
      </p>
    </div>
  );
}



// ══════════════════════════════════════════════════════════════
//  PHẦN 5: BẢNG ĐIỀU KHIỂN PHỤ HUYNH
//  PIN mặc định: 1234 (đổi được trong settings)
// ══════════════════════════════════════════════════════════════
function ParentGate({ onUnlock, onCancel }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);

  // PIN câu hỏi toán cho người lớn (chống trẻ đoán)
  const [q] = useState(() => {
    const a = Math.floor(Math.random() * 5) + 5;
    const b = Math.floor(Math.random() * 5) + 5;
    return { a, b, ans: a + b };
  });

  function check() {
    if (parseInt(pin) === q.ans) onUnlock();
    else { setErr(true); buzz(50); setTimeout(()=>setErr(false), 600); setPin(""); }
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:200,
      background:"rgba(0,0,0,.7)", backdropFilter:"blur(8px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:20,
    }}>
      <div className={`pop ${err?"shake":""}`} style={{
        background:"white", borderRadius:24, padding:"28px 24px",
        maxWidth:340, width:"100%", textAlign:"center",
      }}>
        <div style={{fontSize:50, marginBottom:8}}>🔒</div>
        <h2 className="F" style={{fontSize:22, color:"#444", marginBottom:6}}>Khu vực phụ huynh</h2>
        <p style={{fontSize:14, color:"#888", marginBottom:18}}>
          Để chứng minh bạn là người lớn:
        </p>
        <div className="F" style={{fontSize:32, color:"#6C5CE7", marginBottom:14}}>
          {q.a} + {q.b} = ?
        </div>
        <input
          type="number"
          value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === "Enter" && check()}
          autoFocus
          style={{
            width:"100%", padding:"14px", fontSize:24, fontWeight:900,
            textAlign:"center", borderRadius:14,
            border: err ? "3px solid #dc3545" : "3px solid #eee",
            fontFamily:"'Fredoka One',cursive", color:"#6C5CE7",
            marginBottom:14, outline:"none",
          }}
        />
        <div style={{display:"flex", gap:10}}>
          <button className="B" onClick={() => { sfx.tap(); onCancel(); }} style={{
            flex:1, background:"#f0f0f0", borderRadius:14, padding:"12px 0",
            fontSize:15, fontWeight:700, color:"#666",
          }}>Hủy</button>
          <button className="B" onClick={check} style={{
            flex:1, background:"#6C5CE7", color:"white", borderRadius:14,
            padding:"12px 0", fontSize:15, fontWeight:700,
          }}>Vào</button>
        </div>
      </div>
    </div>
  );
}

function ParentDashboard({ onClose, ageGroup, onChangeAge, kidName, setKidName }) {
  const todayMin = TimeTracker.todayMinutes();
  const weekMin = TimeTracker.weekMinutes();
  const totalLearned = Stats.totalStudied();
  const totalCorrect = Stats.totalCorrect();
  const totalWrong = Stats.totalWrong();
  const accuracy = (totalCorrect + totalWrong) > 0
    ? Math.round(totalCorrect / (totalCorrect + totalWrong) * 100)
    : 0;

  // Tìm các bài bé hay sai nhất
  const allLessons = TOPICS.flatMap(t => t.lessons.map(l => ({...l, topicLabel:t.label, topicColor:t.color})));
  const weakest = Stats.weakestLessons(allLessons, 5);

  // Chủ đề mạnh nhất
  const data = S.get("stats", {});
  const topicScore = {};
  TOPICS.forEach(t => {
    let c = 0, w = 0;
    t.lessons.forEach(l => { if (data[l.id]) { c += data[l.id].correct||0; w += data[l.id].wrong||0; } });
    if (c + w > 0) topicScore[t.id] = { label:t.label, icon:t.icon, score: c / (c+w), total: c+w };
  });
  const topicEntries = Object.entries(topicScore).sort((a,b) => b[1].score - a[1].score);

  const [tab, setTab] = useState("stats");
  const [newName, setNewName] = useState(kidName);

  return (
    <div style={{position:"fixed", inset:0, zIndex:150, background:"#f0f4f8", overflow:"auto"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#6C5CE7,#a29bfe)", padding:"20px 16px", color:"white"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <button className="B" onClick={() => { sfx.tap(); onClose(); }} style={{
            background:"rgba(255,255,255,.22)", borderRadius:99, padding:"6px 14px",
            color:"white", fontSize:14, fontWeight:700,
          }}>← Đóng</button>
          <h2 className="F" style={{fontSize:20}}>👨‍👩 Phụ huynh</h2>
          <div style={{width:60}}/>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex", gap:6, padding:"12px 16px", background:"white", borderBottom:"1px solid #eee"}}>
        {[
          {id:"stats", label:"📊 Báo cáo"},
          {id:"weak",  label:"🎯 Cần ôn"},
          {id:"set",   label:"⚙️ Cài đặt"},
        ].map(t => (
          <button key={t.id} className="B" onClick={() => { sfx.tap(); setTab(t.id); }} style={{
            flex:1, background: tab===t.id ? "#6C5CE7" : "#f0f0f0",
            color: tab===t.id ? "white" : "#666",
            borderRadius:12, padding:"10px 4px", fontSize:13, fontWeight:700,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{padding:"16px"}}>
        {/* TAB BÁO CÁO */}
        {tab === "stats" && (
          <div style={{display:"flex", flexDirection:"column", gap:12}}>
            {/* Thời gian */}
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
              <div style={{background:"white", borderRadius:16, padding:"14px", textAlign:"center"}}>
                <div style={{fontSize:11, color:"#888", fontWeight:700}}>HÔM NAY</div>
                <div className="F" style={{fontSize:30, color:"#6C5CE7", marginTop:4}}>{todayMin}</div>
                <div style={{fontSize:12, color:"#666"}}>phút học</div>
              </div>
              <div style={{background:"white", borderRadius:16, padding:"14px", textAlign:"center"}}>
                <div style={{fontSize:11, color:"#888", fontWeight:700}}>TUẦN NÀY</div>
                <div className="F" style={{fontSize:30, color:"#00B894", marginTop:4}}>{weekMin}</div>
                <div style={{fontSize:12, color:"#666"}}>phút học</div>
              </div>
            </div>

            {/* Tổng quát */}
            <div style={{background:"white", borderRadius:16, padding:"16px"}}>
              <div style={{fontSize:13, color:"#888", fontWeight:700, marginBottom:10}}>📚 TỔNG QUÁT</div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center"}}>
                <div>
                  <div className="F" style={{fontSize:24, color:"#6C5CE7"}}>{totalLearned}</div>
                  <div style={{fontSize:11, color:"#888"}}>bài đã học</div>
                </div>
                <div>
                  <div className="F" style={{fontSize:24, color:"#27ae60"}}>{accuracy}%</div>
                  <div style={{fontSize:11, color:"#888"}}>độ chính xác</div>
                </div>
                <div>
                  <div className="F" style={{fontSize:24, color:"#e17055"}}>{totalCorrect}</div>
                  <div style={{fontSize:11, color:"#888"}}>câu đúng</div>
                </div>
              </div>
            </div>

            {/* Chủ đề mạnh nhất */}
            {topicEntries.length > 0 && (
              <div style={{background:"white", borderRadius:16, padding:"16px"}}>
                <div style={{fontSize:13, color:"#888", fontWeight:700, marginBottom:10}}>🏆 CHỦ ĐỀ THEO ĐỘ GIỎI</div>
                {topicEntries.map(([id, info]) => (
                  <div key={id} style={{display:"flex", alignItems:"center", gap:10, padding:"6px 0"}}>
                    <span style={{fontSize:24}}>{info.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14, fontWeight:700, color:"#444"}}>{info.label}</div>
                      <div style={{height:6, background:"#f0f0f0", borderRadius:99, marginTop:4}}>
                        <div style={{width:`${info.score*100}%`, height:"100%", background:"#6C5CE7", borderRadius:99}}/>
                      </div>
                    </div>
                    <div className="F" style={{fontSize:14, color:"#6C5CE7"}}>{Math.round(info.score*100)}%</div>
                  </div>
                ))}
              </div>
            )}

            {totalLearned === 0 && (
              <div style={{textAlign:"center", color:"#aaa", padding:"30px", background:"white", borderRadius:16}}>
                Bé chưa học bài nào. Bắt đầu nào!
              </div>
            )}
          </div>
        )}

        {/* TAB CẦN ÔN */}
        {tab === "weak" && (
          <div style={{display:"flex", flexDirection:"column", gap:10}}>
            <p style={{fontSize:13, color:"#666", padding:"0 4px"}}>
              Đây là những bài bé thường sai. App sẽ tự ưu tiên đưa các bài này vào session sau.
            </p>
            {weakest.length > 0 ? weakest.map(l => {
              const s = S.get("stats", {})[l.id] || {correct:0, wrong:0};
              return (
                <div key={l.id} style={{background:"white", borderRadius:14, padding:"12px 14px",
                  display:"flex", alignItems:"center", gap:12}}>
                  <span style={{fontSize:32}}>{l.img}</span>
                  <div style={{flex:1}}>
                    <div className="F" style={{fontSize:16, color:l.topicColor}}>{l.vi}</div>
                    <div style={{fontSize:11, color:"#888"}}>{l.topicLabel}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:12, color:"#27ae60", fontWeight:700}}>✓ {s.correct}</div>
                    <div style={{fontSize:12, color:"#e74c3c", fontWeight:700}}>✗ {s.wrong}</div>
                  </div>
                </div>
              );
            }) : (
              <div style={{textAlign:"center", color:"#aaa", padding:"30px", background:"white", borderRadius:16}}>
                🌟 Bé chưa sai bài nào! Tuyệt vời!
              </div>
            )}
          </div>
        )}

        {/* TAB CÀI ĐẶT */}
        {tab === "set" && (
          <div style={{display:"flex", flexDirection:"column", gap:14}}>
            {/* Tên bé */}
            <div style={{background:"white", borderRadius:14, padding:"14px"}}>
              <div style={{fontSize:13, color:"#888", fontWeight:700, marginBottom:8}}>TÊN BÉ</div>
              <div style={{display:"flex", gap:8}}>
                <input value={newName} onChange={e=>setNewName(e.target.value.slice(0,15))} style={{
                  flex:1, padding:"10px 14px", borderRadius:10, border:"2px solid #eee",
                  fontSize:15, fontFamily:"'Fredoka One',cursive", color:"#6C5CE7", outline:"none",
                }}/>
                <button className="B" onClick={() => { S.set("kidName", newName); setKidName(newName); }} style={{
                  background:"#6C5CE7", color:"white", borderRadius:10, padding:"0 16px",
                  fontWeight:700, fontSize:14,
                }}>Lưu</button>
              </div>
            </div>

            {/* Độ tuổi */}
            <div style={{background:"white", borderRadius:14, padding:"14px"}}>
              <div style={{fontSize:13, color:"#888", fontWeight:700, marginBottom:10}}>ĐỘ TUỔI HIỆN TẠI</div>
              <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:10}}>
                <span style={{fontSize:24}}>{AGE_GROUPS[ageGroup].icon}</span>
                <span style={{fontSize:16, fontWeight:700, color:"#444"}}>{AGE_GROUPS[ageGroup].label}</span>
              </div>
              <button className="B" onClick={() => { onChangeAge(); onClose(); }} style={{
                width:"100%", background:"#f0f0f0", color:"#666", borderRadius:10,
                padding:"10px", fontWeight:700, fontSize:14,
              }}>Đổi độ tuổi</button>
            </div>

            {/* Reset data */}
            <div style={{background:"white", borderRadius:14, padding:"14px"}}>
              <div style={{fontSize:13, color:"#888", fontWeight:700, marginBottom:8}}>DỮ LIỆU</div>
              <button className="B" onClick={() => {
                if (confirm("Xóa toàn bộ tiến độ học của bé?")) {
                  S.set("stats", {}); S.set("timeLog", {});
                  alert("Đã xóa!");
                }
              }} style={{
                width:"100%", background:"#fff0f0", color:"#dc3545", borderRadius:10,
                padding:"10px", fontWeight:700, fontSize:13, border:"1px solid #f8d7da",
              }}>🗑️ Xóa tiến độ học</button>
            </div>

            <div style={{fontSize:11, color:"#aaa", textAlign:"center", marginTop:10}}>
              Bé Học Vui v8 · Made with ❤️
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



// ══════════════════════════════════════════════════════════════
//  PHẦN 4: GAME VẬN ĐỘNG TINH
//  Game 1: TÔ MÀU — Vẽ trong khung hình
//  Game 2: VẼ THEO NÉT — Nối các điểm chấm
// ══════════════════════════════════════════════════════════════

function ColoringGame({ topic, onDone, onHome }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#FF6B6B");
  const [touched, setTouched] = useState(0);
  const last = useRef({x:0,y:0});

  const COLORS = ["#FF6B6B","#FF9F43","#FECA57","#00B894","#54A0FF","#A29BFE","#FD79A8","#2C3E50"];

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    cv.width = cv.offsetWidth; cv.height = cv.offsetHeight;
    const ctx = cv.getContext("2d");
    // Vẽ hình tròn outline làm khung tô màu
    ctx.strokeStyle = "#ddd"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cv.width/2, cv.height/2, Math.min(cv.width,cv.height)*0.35, 0, Math.PI*2);
    ctx.stroke();
    // Hiển thị emoji ở giữa làm gợi ý
    ctx.font = `${Math.min(cv.width,cv.height)*0.3}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.15;
    ctx.fillText("🎨", cv.width/2, cv.height/2);
    ctx.globalAlpha = 1;

    speak("Bé tô màu bức tranh nhé!", "vi-VN", 0.85);
  }, []);

  function getPos(e) {
    const cv = canvasRef.current; const r = cv.getBoundingClientRect();
    const t = e.touches?.[0] || e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }
  function start(e) {
    e.preventDefault(); setDrawing(true);
    last.current = getPos(e);
    sfx.tap();
  }
  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const cv = canvasRef.current; const ctx = cv.getContext("2d");
    const pos = getPos(e);
    ctx.strokeStyle = color; ctx.lineWidth = 18; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
    last.current = pos;
    setTouched(t => t + 1);
  }
  function stop() { setDrawing(false); }

  function clear() {
    const cv = canvasRef.current; const ctx = cv.getContext("2d");
    ctx.clearRect(0,0,cv.width,cv.height);
    // Vẽ lại outline
    ctx.strokeStyle = "#ddd"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cv.width/2, cv.height/2, Math.min(cv.width,cv.height)*0.35, 0, Math.PI*2);
    ctx.stroke();
    setTouched(0);
  }

  function finish() { buzz(20); sfx.win(); onDone(); }

  return (
    <div style={{position:"relative", minHeight:"100vh", background:topic.grad}}>
      {onHome && <HomeButton onHome={onHome}/>}
      <div style={{padding:"14px 16px", textAlign:"center"}}>
        <div className="F" style={{color:"white", fontSize:20, textShadow:"0 2px 8px rgba(0,0,0,.3)"}}>
          🎨 Tô màu nào!
        </div>
      </div>
      <div style={{padding:"0 16px"}}>
        <canvas ref={canvasRef} style={{
          width:"100%", height:320, background:"white",
          borderRadius:24, boxShadow:"0 6px 24px rgba(0,0,0,.15)", touchAction:"none",
        }}
          onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}
        />
      </div>
      {/* Bảng màu */}
      <div style={{padding:"14px 16px", display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap"}}>
        {COLORS.map(c => (
          <button key={c} className="B" onClick={()=>{buzz(5); setColor(c);}} style={{
            width:42, height:42, borderRadius:"50%", background:c,
            border: color===c ? "4px solid white" : "4px solid rgba(255,255,255,.4)",
            boxShadow: color===c ? "0 4px 16px rgba(0,0,0,.3)" : "0 2px 8px rgba(0,0,0,.2)",
          }}/>
        ))}
      </div>
      <div style={{padding:"0 16px 24px", display:"flex", gap:10}}>
        <button className="B" onClick={clear} style={{
          flex:1, background:"rgba(255,255,255,.25)", color:"white",
          borderRadius:99, padding:"14px 0", fontSize:15, fontWeight:700,
          border:"2px solid rgba(255,255,255,.4)",
        }}>🗑 Xóa</button>
        <button className="B" onClick={finish} disabled={touched<20} style={{
          flex:2, background: touched>=20 ? "white" : "rgba(255,255,255,.4)",
          color: touched>=20 ? topic.color : "white",
          borderRadius:99, padding:"14px 0", fontSize:17,
          fontFamily:"'Fredoka One',cursive",
        }}>{touched>=20 ? "Xong rồi! ✓" : "Tô thêm chút nhé..."}</button>
      </div>
    </div>
  );
}

// Game vẽ theo nét chấm — học viết chữ/số đơn giản
function TraceGame({ topic, target, onDone, onHome }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hit, setHit] = useState(0);
  const last = useRef({x:0,y:0});

  // Ký tự để tập viết (chữ cái hoặc số)
  const char = target.char || (target.num !== undefined ? String(target.num) : target.vi.charAt(0).toUpperCase());

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    cv.width = cv.offsetWidth; cv.height = cv.offsetHeight;
    drawTemplate();
    speak(`Bé tô theo nét chữ ${char} nhé!`, "vi-VN", 0.85);
  }, []);

  function drawTemplate() {
    const cv = canvasRef.current; const ctx = cv.getContext("2d");
    ctx.clearRect(0,0,cv.width,cv.height);
    // Vẽ chữ to mờ làm template
    ctx.font = `bold ${Math.min(cv.width,cv.height)*0.7}px 'Fredoka One',cursive`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#e0e0e0";
    ctx.fillText(char, cv.width/2, cv.height/2);
  }

  function getPos(e) {
    const cv = canvasRef.current; const r = cv.getBoundingClientRect();
    const t = e.touches?.[0] || e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }
  function start(e) { e.preventDefault(); setDrawing(true); last.current = getPos(e); sfx.tap(); }
  function draw(e) {
    if (!drawing) return; e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.strokeStyle = topic.color; ctx.lineWidth = 14; ctx.lineCap="round"; ctx.lineJoin="round";
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
    last.current = pos;
    setHit(h => h + 1);
  }
  function stop() { setDrawing(false); }
  function clear() { drawTemplate(); setHit(0); }
  function finish() { buzz(20); sfx.win(); onDone(); }

  return (
    <div style={{position:"relative", minHeight:"100vh", background:topic.grad}}>
      {onHome && <HomeButton onHome={onHome}/>}
      <div style={{padding:"14px 16px", textAlign:"center"}}>
        <div className="F" style={{color:"white", fontSize:20, textShadow:"0 2px 8px rgba(0,0,0,.3)"}}>
          ✏️ Tô theo nét chữ {char}!
        </div>
      </div>
      <div style={{padding:"0 16px"}}>
        <canvas ref={canvasRef} style={{
          width:"100%", height:320, background:"white",
          borderRadius:24, boxShadow:"0 6px 24px rgba(0,0,0,.15)", touchAction:"none",
        }}
          onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}
        />
      </div>
      <div style={{padding:"14px 16px 24px", display:"flex", gap:10}}>
        <button className="B" onClick={clear} style={{
          flex:1, background:"rgba(255,255,255,.25)", color:"white",
          borderRadius:99, padding:"14px 0", fontSize:15, fontWeight:700,
          border:"2px solid rgba(255,255,255,.4)",
        }}>🗑 Xóa</button>
        <button className="B" onClick={finish} disabled={hit<30} style={{
          flex:2, background: hit>=30 ? "white" : "rgba(255,255,255,.4)",
          color: hit>=30 ? topic.color : "white",
          borderRadius:99, padding:"14px 0", fontSize:17, fontFamily:"'Fredoka One',cursive",
        }}>{hit>=30 ? "Xong rồi! ✓" : "Tô thêm nhé..."}</button>
      </div>
    </div>
  );
}



// ══════════════════════════════════════════════════════════════
//  LESSON CARD — với chế độ "Học cùng bố mẹ" (im lặng)
// ══════════════════════════════════════════════════════════════
function LessonCard({ lesson, topic, onNext, num, total, onHome, withParent, bigImage }) {
  const [phase, setPhase] = useState(0);
  const [imgCls, setImgCls] = useState("pop");
  const col = lesson.c || topic.color;

  useEffect(() => {
    setPhase(0); setImgCls("pop");
    if (!withParent) {
      // Chế độ tự đọc — Tony nói
      const t1 = setTimeout(() => speak(lesson.vi, "vi-VN", 0.75, 1.18, lesson.id), 350);
      const t2 = setTimeout(() => speak(lesson.en, "en-US", 0.78), 1500);
      const t3 = setTimeout(() => setPhase(1), 2300);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    } else {
      // Học cùng bố mẹ — im lặng, hiện rhyme luôn
      setTimeout(() => setPhase(1), 300);
    }
  }, [lesson.id, withParent]);

  function tapImg() {
    buzz(10); sfx.tap(); setImgCls("wgl");
    setTimeout(() => setImgCls("pop"), 550);
    if (!withParent) {
      speak(lesson.vi, "vi-VN", 0.75, 1.18, lesson.id);
      setTimeout(() => speak(lesson.en, "en-US"), 1000);
    }
  }
  function tapRhyme() {
    buzz(15); sfx.tap();
    if (!withParent) speak(lesson.rhyme.replace(/\n/g, " "), "vi-VN", 0.7, 1.1);
    setPhase(2);
  }
  function tapNext() { buzz(20); sfx.tap(); onNext(); }

  const imgSize = bigImage ? 200 : 160;
  const ImgEl = lesson.c ? (
    <div style={{width:imgSize, height:imgSize, borderRadius:32, background:lesson.c,
      boxShadow:`0 8px 32px ${lesson.c}88`,
      display:"flex", alignItems:"center", justifyContent:"center", fontSize:imgSize*0.45}}>
      {lesson.img}
    </div>
  ) : (
    <span style={{fontSize: imgSize*0.85, lineHeight:1, display:"block",
      filter:"drop-shadow(0 6px 20px rgba(0,0,0,.2))"}}>
      {lesson.img}
    </span>
  );

  return (
    <div style={{position:"relative"}}>
      {onHome && <HomeButton onHome={onHome}/>}
      <div style={{background:topic.grad, padding:"14px 16px 0"}}>
        <div style={{display:"flex", justifyContent:"flex-end", alignItems:"center", marginBottom:8, gap:10}}>
          <span className="F" style={{color:"rgba(255,255,255,.95)", fontSize:15}}>Bài {num}/{total}</span>
          <ProgressDots current={num-1} total={total} color={topic.color}/>
        </div>

        {withParent && (
          <div className="up" style={{
            background:"rgba(255,255,255,.92)", borderRadius:16,
            padding:"8px 12px", marginBottom:12, display:"flex", alignItems:"center", gap:8,
          }}>
            <span style={{fontSize:20}}>👨‍👩</span>
            <span style={{fontSize:13, fontWeight:700, color:"#444"}}>Bố mẹ ơi, đọc cho bé nghe nhé!</span>
          </div>
        )}

        <div onClick={tapImg} style={{display:"flex", justifyContent:"center", paddingBottom:18, cursor:"pointer"}}>
          <div className={imgCls} style={{display:"inline-block"}}>{ImgEl}</div>
        </div>
      </div>

      <div style={{background:"white", borderRadius:"28px 28px 0 0",
        padding:"20px 16px 32px", boxShadow:"0 -6px 28px rgba(0,0,0,.1)"}}>
        {lesson.objs && (
          <div className="up" style={{display:"flex", flexWrap:"wrap", gap:6,
            justifyContent:"center", marginBottom:10}}>
            {lesson.objs.map((o,i) => (<span key={i} className="pop" style={{fontSize:22, animationDelay:`${i*.05}s`}}>{o}</span>))}
          </div>
        )}

        {lesson.char && (
          <div className="F" style={{textAlign:"center", fontSize:56, color:col,
            lineHeight:1, marginBottom:4, textShadow:`0 4px 16px ${col}44`}}>{lesson.char}</div>
        )}
        {lesson.num !== undefined && (
          <div className="F" style={{textAlign:"center", fontSize:56, color:col,
            lineHeight:1, marginBottom:4, textShadow:`0 4px 16px ${col}44`}}>{lesson.num}</div>
        )}

        <div style={{textAlign:"center", marginBottom:14}}>
          <div className="F" style={{fontSize:30, color:"#222", lineHeight:1.15}}>{lesson.vi}</div>
          <div className="F" style={{fontSize:20, color:col, marginTop:4}}>{lesson.en}</div>
        </div>

        {phase >= 1 ? (
          <div className="up" style={{background:`${col}14`, border:`2.5px solid ${col}44`,
            borderRadius:18, padding:"12px 14px", marginBottom:14, cursor:"pointer", textAlign:"center"}}
            onClick={tapRhyme}>
            <div style={{fontSize:13, color:col, fontWeight:900, marginBottom:6}}>
              🎵 Câu vần {!withParent && "— nhấn để nghe!"}
            </div>
            <div style={{fontSize:14, color:"#444", lineHeight:1.75, fontWeight:700, whiteSpace:"pre-line"}}>
              {lesson.rhyme}
            </div>
          </div>
        ) : (
          <div style={{background:"#f4f4f8", borderRadius:18, padding:"12px 14px",
            marginBottom:14, textAlign:"center", color:"#bbb", fontSize:13}}>
            🎵 Đang chuẩn bị câu vần...
          </div>
        )}

        <button className={`B ${phase>=1?"glow":""}`} onClick={phase>=1?tapNext:tapRhyme}
          style={{width:"100%",
            background: phase>=1 ? `linear-gradient(135deg,${col},${col}CC)` : "#f0f0f0",
            borderRadius:99, padding:"18px 0", color: phase>=1 ? "white" : "#bbb",
            fontSize:21, fontFamily:"'Fredoka One',cursive",
            boxShadow: phase>=1 ? `0 6px 24px ${col}66` : "none"}}>
          {phase>=1 ? (num<total ? "Bài tiếp theo ▶" : "🎉 Xong rồi!") : "Nghe câu vần 🎵"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  GUESS CARD — với tracking AI
// ══════════════════════════════════════════════════════════════
function GuessCard({ lesson, pool, topic, onResult, onHome, withParent }) {
  const [opts, setOpts] = useState([]);
  const [picked, setPicked] = useState(null);
  const [states, setStates] = useState({});
  const col = lesson.c || topic.color;

  useEffect(() => {
    setPicked(null); setStates({});
    const wrong = shuffle(pool.filter(l => l.id !== lesson.id)).slice(0, 3);
    setOpts(shuffle([lesson, ...wrong]));
    if (!withParent) setTimeout(() => speak("Đây là gì?", "vi-VN", 0.78), 200);
  }, [lesson.id]);

  function tap(opt) {
    if (picked) return;
    buzz(15); sfx.tap(); setPicked(opt);
    const ok = opt.id === lesson.id;
    // PHẦN 7: Tracking AI
    Stats.record(lesson.id, ok);
    if (ok) {
      sfx.correct(); buzz(30);
      if (!withParent) speak("Đúng rồi! Bé giỏi quá!", "vi-VN", 0.82);
      setStates({[opt.id]:"ok"});
    } else {
      sfx.wrong();
      if (!withParent) speak("Chưa đúng! Thử lại!", "vi-VN", 0.82);
      setStates({[opt.id]:"no", [lesson.id]:"ok"});
    }
    setTimeout(() => onResult(ok), 1600);
  }

  function getLabel(l) { return l.char || (l.num !== undefined ? String(l.num) : l.vi); }
  const ImgEl = lesson.c
    ? <div style={{width:140, height:140, borderRadius:26, background:lesson.c,
        boxShadow:`0 6px 24px ${lesson.c}88`,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:64}}>{lesson.img}</div>
    : <span style={{fontSize:120, lineHeight:1, display:"block",
        filter:"drop-shadow(0 6px 20px rgba(0,0,0,.2))"}}>{lesson.img}</span>;

  return (
    <div style={{position:"relative"}}>
      {onHome && <HomeButton onHome={onHome}/>}
      <div style={{background:topic.grad, padding:"14px 16px 0"}}>
        <div style={{display:"flex", justifyContent:"flex-end", marginBottom:10}}>
          <Mascot mood="thinking" message={withParent ? "Bố mẹ hỏi nhé!" : "Đây là gì?"} size={50}/>
        </div>
        <div style={{display:"flex", justifyContent:"center", paddingBottom:16}}>
          <div className="pop">{ImgEl}</div>
        </div>
      </div>
      <div style={{background:"white", borderRadius:"28px 28px 0 0",
        padding:"16px 14px 32px", boxShadow:"0 -6px 28px rgba(0,0,0,.1)"}}>
        <div style={{textAlign:"center", marginBottom:12, fontSize:14, fontWeight:700, color:"#888"}}>
          🎯 Chọn đáp án đúng!
        </div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
          {opts.map((opt,i) => {
            const st = states[opt.id];
            return (
              <button key={opt.id} className={`B pop ${st==="no"?"shake":""}`}
                style={{animationDelay:`${i*.07}s`,
                  background: st==="ok" ? "#d4edda" : st==="no" ? "#f8d7da" : "#f8f8f8",
                  border: st==="ok" ? "3px solid #28a745" : st==="no" ? "3px solid #dc3545" : "3px solid #eee",
                  borderRadius:20, padding:"14px 8px", minHeight:88,
                  display:"flex", flexDirection:"column", alignItems:"center", gap:6, width:"100%"}}
                onClick={() => tap(opt)}>
                <div style={{fontSize:36}}>
                  {opt.c
                    ? <span style={{display:"inline-block", width:40, height:40,
                        borderRadius:10, background:opt.c, border:"2px solid rgba(0,0,0,.08)"}}/>
                    : opt.img}
                </div>
                <div className="F" style={{fontSize:15, lineHeight:1.1, textAlign:"center",
                  color: st==="ok"?"#155724" : st==="no"?"#721c24" : "#333"}}>
                  {getLabel(opt)}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  LEARNING FLOW v8 — Có vận động tinh xen kẽ
// ══════════════════════════════════════════════════════════════
function LearningFlow({ topic, kidName, ageGroup, withParent, onDone, onHome }) {
  const group = AGE_GROUPS[ageGroup];

  // PHẦN 7: AI — Ưu tiên bài hay sai
  const sortedLessons = useRef(Stats.sortByPriority(topic.lessons)).current;
  const lessons = useRef(sortedLessons.slice(0, group.sessionSize)).current;

  // Cấu trúc step: phần lớn là learn, có xen guess + 1 trace + 1 coloring
  // (Tính trước rồi đưa vào useRef để giữ ổn định qua các lần render)
  const STEPS = useRef((() => {
    const n = group.sessionSize;
    const arr = [];
    for (let i = 0; i < n; i++) {
      if (i === Math.floor(n*0.4)) arr.push("trace"); // vẽ chữ giữa
      else if (i === Math.floor(n*0.8)) arr.push("color"); // tô màu cuối
      else if (i >= n - 3) arr.push("guess");
      else arr.push("learn");
    }
    return arr;
  })()).current;

  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [conf, setConf] = useState(false);

  const cur = STEPS[step] || "learn";
  const lesson = lessons[Math.min(step, lessons.length-1)];

  function nextStep(addScore=0) {
    if (addScore) { setScore(s => s + addScore); setConf(true); setTimeout(()=>setConf(false), 1500); }
    if (step + 1 >= STEPS.length) {
      setTimeout(() => onDone(score + addScore, STEPS.filter(s=>s==="guess").length), 600);
    } else setTimeout(() => setStep(s => s + 1), 400);
  }

  if (!lesson) return null;

  return (
    <div style={{position:"relative"}}>
      {conf && <Confetti/>}
      {cur !== "trace" && cur !== "color" && (
        <div style={{position:"absolute", top:14, right:14, zIndex:10,
          background:"rgba(255,255,255,.28)", backdropFilter:"blur(8px)",
          borderRadius:99, padding:"4px 12px", fontSize:12, fontWeight:700, color:"white"}}>
          {cur === "learn" ? "📖 Học" : "🎯 Đoán"}
        </div>
      )}

      {cur === "learn" && (
        <LessonCard key={lesson.id+"l"+step} lesson={lesson} topic={topic}
          num={step+1} total={STEPS.length} onNext={()=>nextStep(0)}
          onHome={onHome} withParent={withParent} bigImage={group.bigImage}/>
      )}
      {cur === "guess" && (
        <GuessCard key={lesson.id+"q"+step} lesson={lesson} pool={topic.lessons}
          topic={topic} onResult={ok => nextStep(ok?1:0)} onHome={onHome} withParent={withParent}/>
      )}
      {cur === "trace" && (
        <TraceGame topic={topic} target={lesson}
          onDone={()=>nextStep(1)} onHome={onHome}/>
      )}
      {cur === "color" && (
        <ColoringGame topic={topic} onDone={()=>nextStep(1)} onHome={onHome}/>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  WIN SCREEN
// ══════════════════════════════════════════════════════════════
function WinScreen({ topic, score, total, kidName, onHome, onRetry }) {
  const pct = total > 0 ? score/total : 1;
  const [icon, msg] = pct >= 0.8 ? ["🏆", `Xuất sắc! ${kidName} giỏi lắm!`]
                    : pct >= 0.5 ? ["🌟", `${kidName} học giỏi!`]
                    :              ["💪", "Cố gắng thêm nhé!"];

  useEffect(() => {
    sfx.win(); buzz(50);
    setTimeout(() => speak(msg, "vi-VN", 0.8), 700);
    TimeTracker.endSession();
  }, []);

  return (
    <div style={{background:topic.grad, padding:"40px 20px 52px",
      display:"flex", flexDirection:"column", alignItems:"center",
      minHeight:"80vh", justifyContent:"center", position:"relative"}}>
      <Confetti/>
      <div style={{marginBottom:14}}><Mascot mood="cheer" size={90}/></div>
      <div className="pop" style={{fontSize:74, marginBottom:8}}>{icon}</div>
      <div className="F up" style={{fontSize:28, color:"white",
        textShadow:"0 3px 16px rgba(0,0,0,.3)", textAlign:"center",
        marginBottom:16, animationDelay:".15s", maxWidth:320}}>{msg}</div>

      <div className="up" style={{display:"flex", gap:12, marginBottom:20, animationDelay:".3s"}}>
        {[1,2,3].map(i => {
          const lit = pct >= 0.8 || (pct >= 0.5 && i <= 2) || (i === 1);
          return <span key={i} className={lit?"pop":""} style={{fontSize:48,
            opacity:lit?1:.22, filter:lit?"drop-shadow(0 0 12px gold)":"none",
            animationDelay:`${.3+i*.12}s`}}>⭐</span>;
        })}
      </div>

      {total > 0 && (
        <div className="up" style={{background:"rgba(255,255,255,.25)", borderRadius:16,
          padding:"10px 24px", color:"white", fontWeight:700, fontSize:18,
          marginBottom:28, animationDelay:".5s"}}>Đúng {score}/{total} câu 🎯</div>
      )}

      <div style={{display:"flex", flexDirection:"column", gap:12, width:"100%", maxWidth:320}}>
        <button className="B" onClick={() => { buzz(20); sfx.tap(); onRetry(); }} style={{
          background:"white", borderRadius:99, padding:"18px 0",
          fontSize:20, fontFamily:"'Fredoka One',cursive",
          color:topic.color, boxShadow:"0 6px 24px rgba(0,0,0,.2)"}}>
          🔄 Học tiếp!
        </button>
        <button className="B" onClick={() => { buzz(20); sfx.tap(); onHome(); }} style={{
          background:"rgba(255,255,255,.22)", borderRadius:99, padding:"16px 0",
          fontSize:18, fontWeight:700, color:"white",
          border:"2.5px solid rgba(255,255,255,.45)"}}>
          🏠 Chọn chủ đề khác
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  NAME PROMPT
// ══════════════════════════════════════════════════════════════
function NamePrompt({ onDone }) {
  const [name, setName] = useState("");
  return (
    <div style={{background:"linear-gradient(160deg,#667eea,#764ba2)",
      minHeight:"100vh", padding:"40px 20px",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
      <div className="pulseM" style={{fontSize:80, marginBottom:14}}>🦉</div>
      <h1 className="F" style={{color:"white", fontSize:30, marginBottom:8, textShadow:"0 3px 14px rgba(0,0,0,.3)"}}>Xin chào!</h1>
      <p style={{color:"rgba(255,255,255,.9)", fontSize:16, marginBottom:24, textAlign:"center", maxWidth:300}}>
        Mình là Cú Tony! Bé tên là gì để Tony gọi nhé?
      </p>
      <input type="text" value={name} onChange={e => setName(e.target.value.slice(0,15))}
        placeholder="Tên bé..." style={{width:"100%", maxWidth:300, padding:"14px 18px",
          fontSize:20, fontFamily:"'Fredoka One',cursive",
          borderRadius:99, border:"3px solid rgba(255,255,255,.4)",
          background:"rgba(255,255,255,.95)", color:"#6C5CE7",
          textAlign:"center", outline:"none", marginBottom:16}}/>
      <button className="B" onClick={() => { if(name.trim()){ buzz(20); S.set("kidName", name.trim()); onDone(name.trim()); } }}
        disabled={!name.trim()} style={{
          background: name.trim() ? "white" : "rgba(255,255,255,.4)",
          borderRadius:99, padding:"14px 36px",
          fontSize:18, fontFamily:"'Fredoka One',cursive",
          color:"#6C5CE7", boxShadow:"0 6px 24px rgba(0,0,0,.2)",
        }}>Bắt đầu nào! ▶</button>
      <button className="B" onClick={() => { S.set("kidName", "bé"); onDone("bé"); }}
        style={{background:"transparent", color:"rgba(255,255,255,.7)", marginTop:14, fontSize:13, textDecoration:"underline"}}>
        Bỏ qua
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROOT APP
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("home");
  const [topic, setTopic] = useState(null);
  const [result, setResult] = useState({score:0, total:0});
  const [kidName, setKidName] = useState(() => S.get("kidName", null));
  const [ageGroup, setAgeGroup] = useState(() => S.get("ageGroup", null));
  const [withParent, setWithParent] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [parentGate, setParentGate] = useState(false);

  useEffect(() => {
    const u = () => { getAC(); window.speechSynthesis?.getVoices(); };
    document.addEventListener("touchstart", u, {once:true, passive:true});
    document.addEventListener("mousedown", u, {once:true});
  }, []);

  function start(t) {
    setTopic(t); setScreen("learn");
    TimeTracker.startSession();
  }
  function finish(score, total) {
    setResult({score, total}); setScreen("win");
  }

  if (!kidName) return (<><style>{CSS}</style><NamePrompt onDone={setKidName}/></>);
  if (!ageGroup) return (<><style>{CSS}</style><AgeSelect onPick={setAgeGroup}/></>);

  return (
    <>
      <style>{CSS}</style>
      {screen === "home" && (
        <HomeScreen onStart={start} kidName={kidName} ageGroup={ageGroup}
          onParent={()=>setParentGate(true)}
          onChangeAge={()=>setAgeGroup(null)}
          withParent={withParent} setWithParent={setWithParent}/>
      )}
      {screen === "learn" && topic && (
        <LearningFlow key={topic.id+"_"+Date.now()} topic={topic} kidName={kidName}
          ageGroup={ageGroup} withParent={withParent}
          onDone={finish} onHome={()=>{ TimeTracker.endSession(); setScreen("home"); }}/>
      )}
      {screen === "win" && topic && (
        <WinScreen topic={topic} score={result.score} total={result.total} kidName={kidName}
          onHome={()=>setScreen("home")} onRetry={()=>start(topic)}/>
      )}
      {parentGate && (
        <ParentGate onUnlock={()=>{ setParentGate(false); setParentOpen(true); }}
          onCancel={()=>setParentGate(false)}/>
      )}
      {parentOpen && (
        <ParentDashboard onClose={()=>setParentOpen(false)}
          ageGroup={ageGroup} onChangeAge={()=>setAgeGroup(null)}
          kidName={kidName} setKidName={setKidName}/>
      )}
    </>
  );
}
