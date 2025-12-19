// Shared script for quiz: questions, timers, lifelines, scoring, navigation
(function(){
  // Try to unmute and autoplay any <audio> elements on user-visible pages.
  document.addEventListener('DOMContentLoaded', ()=>{
    try{
      const audios = Array.from(document.querySelectorAll('audio'));
      audios.forEach(a=>{
        try{ a.muted = false; a.volume = 1.0; }catch(e){}
        try{
          a.play().catch(()=>{
            document.addEventListener('click', function playOnce(){ a.play().catch(()=>{}); document.removeEventListener('click', playOnce, {capture:true}); }, {capture:true});
          });
        }catch(e){}
      });
    }catch(e){}
  }, {once:true});
  const questionsByRound = {
    1: [
      {q: "In 4582 the digit in the hundred’s place is?", opts:['5','4','8','2'], a:2},
      {q: 'Successor of 7829 is?', opts:['7828','7892','7830','7329'], a:2},
      {q: 'A shape with 3 sides is called?', opts:['Square','Triangle','Cone','Cube'], a:1},
      {q: 'The bottom number of a fraction is called?', opts:['Numerator','Whole number','Denominator','None of these'], a:2},
      {q: 'The largest 4 digit number is?', opts:['9999','1000','9876','1021'], a:0}
    ],
    2: [
      {q: 'Which shape rolls but has no edges?', opts:['Cone','Cube','Cuboid','Sphere'], a:3},
      {q: 'If 325 × 4 = 1300 then what is 325 × 8?', opts:['2800','3000','2600','3700'], a:2},
      {q: 'What is the ascending order of 3/4, 1/4, 5/4?', opts:['5/4, 3/4, 1/4','3/4, 1/4, 5/4','5/4, 1/4, 3/4','1/4, 3/4, 5/4'], a:3},
      {q: 'How many 4 digit numbers are there between 2345 and 2355?', opts:['8','10','9','5'], a:0},
      {q: 'Find the number which when multiplied by 6 gives 72?', opts:['12','9','8','14'], a:0}
    ],
    // Round 3 pool: contains many questions; each game will pick 5 shuffled items from this pool
    3: [
      {q: 'If a number divided by 7 gives 14 as quotient, what is that number?', opts:['91','98','105','63'], a:1},
      {q: 'How many edges are there in 3 cylinders?', opts:['2','4','7','6'], a:3},
      {q: 'Which problem needs division to solve?', opts:['Total number of apples','Sharing apples equally','Adding apples','Buying apples'], a:1},
      {q: 'Which gives the largest answer?', opts:['400 × 2','400 ÷ 2','400 + 2','400 − 2'], a:0},
      {q: 'Which of the following has the greatest digit sum?', opts:['4111','3222','2333','1444'], a:3},
      {q: 'Which operation is best to check subtraction answer?', opts:['Multiplication','Division','Addition','Subtraction'], a:2},
      {q: 'Which pair has the same number of faces?', opts:['Cube & Cone','Sphere & Cylinder','Cube & Cylinder','Cube & Cuboid'], a:3},
      {q: 'Which number will not change when divided by 1?', opts:['Any number','Only even numbers','Only odd numbers','None of these'], a:0},
      {q: 'Riya ate 1/4 chocolate in the morning and 1/4 in the evening. How much did she eat?', opts:['1/4','1/2','2/8','1'], a:1},
      {q: 'Without solving, which is greater? 4589 + 231 or 4589 + 213', opts:['First','Second','Same','Cannot say'], a:0},
      {q: 'If 125 × 8 = 1000 then 1000 ÷ 8 = ?', opts:['8','125','250','1'], a:1},
      {q: 'Which number has the same digit in thousand’s and ten’s place?', opts:['4243','3584','5645','6456'], a:0},
      {q: 'A number is added to itself 5 times. This is same as?', opts:['Multiplying by 4','Multiplying by 5','Dividing by 5','Adding by 5'], a:1},
      {q: 'Which statement is false?', opts:['Division always makes numbers smaller','Multiplication always makes numbers bigger','Multiplying by 0 gives 0','Dividing by 0 is possible'], a:3},
      {q: 'A number has 5 thousands and the rest of digits are 0, the number is?', opts:['500','5000','5050','50000'], a:1},
      {q: 'Which solid shape rolls the best?', opts:['Cube','Cone','Sphere','Cylinder'], a:2}
    ]
  };

  function qs(sel){return document.querySelector(sel)}
  function qsa(sel){return Array.from(document.querySelectorAll(sel))}

  // helper to read page context
  const page = document.body;
  const isQuestion = page.classList.contains('question-page');

  if(!localStorage.getItem('scoreR1')){
    localStorage.setItem('scoreR1','0');
    localStorage.setItem('scoreR2','0');
    localStorage.setItem('scoreR3','0');
  }

    if(isQuestion){
      const round = Number(page.dataset.round);
      const position = Number(page.dataset.q); // page position in the round (0..4)
      const orderKey = 'order_R'+round;
      let order = null;
      try{ order = JSON.parse(localStorage.getItem(orderKey)); }catch(e){ order = null }
      if(!Array.isArray(order) || order.length !== 5){
        // Build a shuffled selection of 5 indices from the available pool for this round
        const poolLen = (questionsByRound[round]||[]).length;
        const indices = Array.from({length:poolLen}, (_,i)=>i);
        for(let i=indices.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
        order = indices.slice(0, Math.min(5, indices.length));
        // If pool had fewer than 5 (unlikely), pad with zeros to keep length 5
        while(order.length < 5) order.push(0);
        localStorage.setItem(orderKey, JSON.stringify(order));
      }
      const actualIndex = order[position];
      const data = questionsByRound[round][actualIndex];

    const timerEl = qs('#timer');
    const questionEl = qs('#question');
    const optionsWrap = qs('#options');
    const optEls = qsa('.option');
    const skipBtn = qs('#skipBtn');
    const nextBtn = qs('#nextBtn');
    const lif50 = qs('#lifeline50');
    const lifPhone = qs('#lifelinePhone');
    const lifPoll = qs('#lifelinePoll');

    let locked = false;
    let timer = null;
    let timeLeft = (round===1?60:(round===2?90:0));

    // Background ticking audio for question pages only (looping clock)
    let clockAudio = null;
    try{
      clockAudio = new Audio('clock.mp3');
      clockAudio.loop = true;
      try{ clockAudio.muted = false; }catch(e){}
      clockAudio.volume = 0.6;
      // try to autoplay; if blocked, play on first user interaction
      clockAudio.play().catch(()=>{
        document.addEventListener('click', function playOnce(){
          clockAudio.play().catch(()=>{});
          document.removeEventListener('click', playOnce, {capture:true});
        }, {capture:true});
      });
      // ensure audio pauses on unload
      window.addEventListener('beforeunload', ()=>{ try{ clockAudio.pause(); clockAudio.currentTime = 0; }catch(e){} });
    }catch(e){ clockAudio = null; }

    // correct / wrong answer sounds (play only when an option is clicked)
    let correctAudio = null, wrongAudio = null;
    try{
      correctAudio = new Audio('correct.mp3'); correctAudio.volume = 0.9;
      wrongAudio = new Audio('wrong.mp3'); wrongAudio.volume = 0.9;
    }catch(e){ correctAudio = null; wrongAudio = null; }

    function loadQuestion(){
      questionEl.textContent = data.q;
      data.opts.forEach((o,i)=>{
        const el = optionsWrap.querySelector(`.option[data-index="${i}"] .text`);
        if(el) el.textContent = o;
        const opt = optionsWrap.querySelector(`.option[data-index="${i}"]`);
        opt.classList.remove('correct','wrong','disabled');
        opt.style.display = '';
      });
      // lifelines state
      const lifKey = 'lifelines_R'+round;
      const lif = JSON.parse(localStorage.getItem(lifKey) || '{"50-50":false,"phone":false,"poll":false}');
      if(lif['50-50']) lif50.classList.add('disabled'); else lif50.classList.remove('disabled');
      if(lif['phone']) lifPhone.classList.add('disabled'); else lifPhone.classList.remove('disabled');
      if(lif['poll']) lifPoll.classList.add('disabled'); else lifPoll.classList.remove('disabled');
      // reset buttons
      nextBtn.style.display='none';
      skipBtn.style.display='inline-block';
      locked = false;
      if(timeLeft>0){ timerEl.style.display = 'block'; timerEl.textContent = timeLeft; startTimer(); } else { timerEl.style.display='none'; }
    }

    function startTimer(){
      clearInterval(timer);
      timer = setInterval(()=>{
        timeLeft -=1; timerEl.textContent = timeLeft;
        if(timeLeft<=0){ clearInterval(timer); lockForTimeout(); }
      },1000);
    }

    function lockForTimeout(){
      locked = true; optEls.forEach(o=>o.classList.add('disabled'));
      nextBtn.style.display='none'; skipBtn.style.display='inline-block';
    }

    function markCorrect(el){
      el.classList.add('correct');
      optEls.forEach(o=>o.classList.add('disabled'));
      nextBtn.style.display='inline-block'; skipBtn.style.display='none';
    }

    function markWrong(el){
      el.classList.add('wrong');
      optEls.forEach(o=>o.classList.add('disabled'));
      nextBtn.style.display='none'; skipBtn.style.display='inline-block';
    }

    // option click
    optEls.forEach(opt=>{
      opt.addEventListener('click', ()=>{
        if(locked) return; locked = true; clearInterval(timer);
        const idx = Number(opt.dataset.index);
        if(idx === data.a){
          // correct
          const key = 'scoreR'+round; let cur = Number(localStorage.getItem(key)||'0'); cur +=1; localStorage.setItem(key,String(cur));
          markCorrect(opt);
          try{ if(correctAudio) correctAudio.currentTime = 0; correctAudio && correctAudio.play().catch(()=>{}); }catch(e){}
        } else {
          markWrong(opt);
          try{ if(wrongAudio) wrongAudio.currentTime = 0; wrongAudio && wrongAudio.play().catch(()=>{}); }catch(e){}
        }
      });
    });

    // navigation
    function nextUrl(){
      const r = round; const i = position;
      if(i < 4) return `r${r}q${i+2}.html`;
      if(r===1) return 'round2.html';
      if(r===2) return 'round3.html';
      return 'results.html';
    }

    nextBtn.addEventListener('click', ()=>{ try{ if(clockAudio){ clockAudio.pause(); clockAudio.currentTime = 0; } }catch(e){}; window.location.href = nextUrl(); });
    skipBtn.addEventListener('click', ()=>{ try{ if(clockAudio){ clockAudio.pause(); clockAudio.currentTime = 0; } }catch(e){}; window.location.href = nextUrl(); });

    // lifelines
    function useLifeline(name, removeCount){
      const key = 'lifelines_R'+round;
      const lif = JSON.parse(localStorage.getItem(key) || '{"50-50":false,"phone":false,"poll":false}');
      if(lif[name]) return; // already used
      // choose incorrect options
      const incorrect = [];
      data.opts.forEach((_,i)=>{ if(i!==data.a) incorrect.push(i); });
      // shuffle
      for(let i=incorrect.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [incorrect[i],incorrect[j]]=[incorrect[j],incorrect[i]]; }
      const toRemove = incorrect.slice(0,removeCount);
      toRemove.forEach(idx=>{
        const opt = optionsWrap.querySelector(`.option[data-index="${idx}"]`);
        if(opt){ opt.style.display='none'; opt.classList.add('disabled'); }
      });
      lif[name]=true; localStorage.setItem(key,JSON.stringify(lif));
      // visually disable button
      if(name==='50-50') lif50.classList.add('disabled');
      if(name==='phone') lifPhone.classList.add('disabled');
      if(name==='poll') lifPoll.classList.add('disabled');
    }

    lif50.addEventListener('click', ()=>{ useLifeline('50-50',2); });
    lifPhone.addEventListener('click', ()=>{ useLifeline('phone',1); });
    lifPoll.addEventListener('click', ()=>{ useLifeline('poll',1); });

    // initialize
    loadQuestion();
  }

  // Results page
  if(document.body.classList.contains('results-page')){
    // handled in results.html with inline script
  }
})();
