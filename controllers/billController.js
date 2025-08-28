const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const Bill = require('../models/Bill');
function extractFields(text) {
  const lines = (text||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  let vendor='';
  for(const l of lines){ if(/^[A-Za-z].{2,}/.test(l) && !/total/i.test(l)){ vendor=l; break; } }
  const dateRe = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|([A-Za-z]{3,9}\s\d{1,2},?\s\d{4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/;
  const m = text.match(dateRe); let billDate=null;
  if(m){ const parsed = Date.parse(m[0]); if(!isNaN(parsed)) billDate=new Date(parsed); }
  const amountRe = /([\$₹€£]?\s?\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?)/g;
  let amounts=[]; let mm;
  while((mm=amountRe.exec(text))!==null){ const clean=mm[0].replace(/[\$₹€£\s,]/g,''); const val=parseFloat(clean); if(!isNaN(val)) amounts.push(val); }
  const amount = amounts.length? Math.max(...amounts): null;
  return { vendor, billDate, amount };
}
exports.upload = async (req, res) => {
  try{
    if(!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const uploadsDir = path.join(__dirname,'..','uploads');
    if(!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
    const safeName = Date.now()+'-'+req.file.originalname.replace(/[^\w.\-]/g,'_');
    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, req.file.buffer);
    let text='';
    try{ const result = await Tesseract.recognize(filePath,'eng'); text = result.data?.text || ''; }catch(e){ console.error('OCR error', e.message||e); }
    const fields = extractFields(text);
    const bill = await Bill.create({
      user: req.user.id,
      fileName: req.file.originalname,
      fileUrl: `/uploads/${safeName}`,
      extractedText: text,
      vendor: fields.vendor || 'Unknown Vendor',
      billDate: fields.billDate,
      amount: fields.amount
    });
    return res.json({ success: true, bill });
  }catch(e){ console.error(e); return res.status(500).json({ message: 'Upload error' }); }
};
exports.list = async (req, res) => {
  try{ const bills = await Bill.find({ user: req.user.id, isDeleted:false }).sort({ createdAt:-1 }); res.json(bills); }catch(e){ console.error(e); res.status(500).json({ message:'List error' }); }
};
exports.getOne = async (req,res)=>{ try{ const bill = await Bill.findOne({ _id:req.params.id, user:req.user.id }); if(!bill) return res.status(404).json({ message:'Not found' }); res.json(bill); }catch(e){ console.error(e); res.status(500).json({ message:'Fetch error' }); } };
exports.bulkDelete = async (req,res)=>{ try{ const { ids } = req.body; if(!Array.isArray(ids)||!ids.length) return res.status(400).json({ message:'No ids' }); await Bill.updateMany({ _id:{ $in: ids }, user: req.user.id }, { $set:{ isDeleted:true } }); res.json({ success:true }); }catch(e){ console.error(e); res.status(500).json({ message:'Delete error' }); } };
exports.trashList = async (req,res)=>{ try{ const bills = await Bill.find({ user:req.user.id, isDeleted:true }).sort({ updatedAt:-1 }); res.json(bills); }catch(e){ console.error(e); res.status(500).json({ message:'Trash list error' }); } };
exports.restore = async (req,res)=>{ try{ const { ids } = req.body; if(!Array.isArray(ids)||!ids.length) return res.status(400).json({ message:'No ids' }); await Bill.updateMany({ _id:{ $in: ids }, user: req.user.id }, { $set:{ isDeleted:false } }); res.json({ success:true }); }catch(e){ console.error(e); res.status(500).json({ message:'Restore error' }); } };
exports.permanentDelete = async (req,res)=>{ try{ const { ids } = req.body; if(!Array.isArray(ids)||!ids.length) return res.status(400).json({ message:'No ids' }); await Bill.deleteMany({ _id:{ $in: ids }, user: req.user.id }); res.json({ success:true }); }catch(e){ console.error(e); res.status(500).json({ message:'Permanent delete error' }); } };
