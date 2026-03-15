import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { parseCSVStatement, parsePDFStatement, categorizeTransaction } from "@/lib/statement-parser"

async function extractPDFText(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid module resolution issues in edge runtime
  const pdfParse = (await import("pdf-parse")).default
  const data = await pdfParse(buffer)
  return data.text
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const bankId = formData.get("bankId") as string

    if (!file || !bankId) {
      return NextResponse.json(
        { error: "File and bank selection are required" },
        { status: 400 }
      )
    }

    const isPDF =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")

    // Create statement upload record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from("statement_uploads")
      .insert({
        user_id: user.id,
        filename: file.name,
        status: "processing",
        transactions_count: 0,
      })
      .select()
      .single()

    if (uploadError || !uploadRecord) {
      console.error("Error creating upload record:", uploadError)
      return NextResponse.json({ error: "Failed to create upload record" }, { status: 500 })
    }

    // Get user's categories for auto-categorisation
    const { data: categories } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)

    // Parse the statement based on file type
    let parsedTransactions
    try {
      if (isPDF) {
        const buffer = Buffer.from(await file.arrayBuffer())
        const text = await extractPDFText(buffer)
        parsedTransactions = parsePDFStatement(text)
      } else {
        const content = await file.text()
        parsedTransactions = parseCSVStatement(content, bankId)
      }
    } catch (parseErr) {
      console.error("Parse error:", parseErr)
      await supabase
        .from("statement_uploads")
        .update({ status: "failed", error_message: "Failed to parse file" })
        .eq("id", uploadRecord.id)

      return NextResponse.json(
        { error: isPDF ? "Failed to parse PDF. Ensure the file is a text-based bank statement." : "Failed to parse CSV file." },
        { status: 400 }
      )
    }

    if (parsedTransactions.length === 0) {
      await supabase
        .from("statement_uploads")
        .update({ status: "failed", error_message: "No transactions found in file" })
        .eq("id", uploadRecord.id)

      return NextResponse.json(
        { error: "No transactions found in the uploaded file. Check the bank format selection." },
        { status: 400 }
      )
    }

    // Categorise and build insert payload
    const transactionsToInsert = parsedTransactions.map((t) => {
      const categoryId = categorizeTransaction(t.description, t.amount, categories || [])
      return {
        user_id: user.id,
        amount: Math.abs(t.amount),
        type: t.amount < 0 ? "expense" : "income",
        description: t.description,
        date: t.date,
        merchant: t.merchant || null,
        category_id: categoryId,
        statement_upload_id: uploadRecord.id,
        is_recurring: false,
      }
    })

    // Insert and select back so we can return them for the review UI
    const { data: insertedTransactions, error: insertError } = await supabase
      .from("transactions")
      .insert(transactionsToInsert)
      .select("*, category:categories(*)")

    if (insertError) {
      console.error("Error inserting transactions:", insertError)
      await supabase
        .from("statement_uploads")
        .update({ status: "failed", error_message: "Failed to insert transactions" })
        .eq("id", uploadRecord.id)

      return NextResponse.json({ error: "Failed to save transactions" }, { status: 500 })
    }

    // Mark upload complete
    await supabase
      .from("statement_uploads")
      .update({
        status: "completed",
        transactions_count: transactionsToInsert.length,
      })
      .eq("id", uploadRecord.id)

    return NextResponse.json({
      success: true,
      transactionsCount: transactionsToInsert.length,
      uploadId: uploadRecord.id,
      transactions: insertedTransactions || [],
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
