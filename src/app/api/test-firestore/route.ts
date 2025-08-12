import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'

export async function GET() {
  try {
    // Test Firestore connection
    const testDoc = doc(db, 'test', 'connection')
    await setDoc(testDoc, {
      message: 'Firestore is working!',
      timestamp: new Date()
    })
    
    const docSnap = await getDoc(testDoc)
    
    if (docSnap.exists()) {
      return NextResponse.json({ 
        success: true, 
        message: 'Firestore connection successful',
        data: docSnap.data()
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Document write succeeded but read failed'
      })
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: 'Firestore connection failed',
      error: error.message
    }, { status: 500 })
  }
}