
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" >

    <xsl:template match="bill">
        <div class="legislation">
            <div>
                <div class="bill top-level">
                     <xsl:attribute name="id">
                        <xsl:value-of select="@id"/>
                    </xsl:attribute>
                    <xsl:call-template name="current"/>
                    <xsl:apply-templates select="billref|billdetail|cover|front|body|schedule.group|end|explnote"/>
                </div>
            </div>
        </div>
    </xsl:template>


    <xsl:template match="sop">
        <div class="legislation">
            <div>
                <div class="sop top-level">
                     <xsl:attribute name="id">
                        <xsl:value-of select="@id"/>
                    </xsl:attribute>
                <xsl:apply-templates select="bill.sop.body/bill|billref|body|explnote|end" />
                </div>
            </div>
        </div>
    </xsl:template>

    <xsl:template match="sop.amend">
        <div class="sop-amend">
                 <xsl:attribute name="id">
                    <xsl:value-of select="@id"/>
                </xsl:attribute>
            <p class="clause-ref"><xsl:value-of select="clause.ref"/></p>
            <xsl:apply-templates select="sop.para"/>

        </div>
    </xsl:template>

    <xsl:template match="billref">
        <p class="billref"><xsl:value-of select="."/></p>
    </xsl:template>

    <xsl:template match="sop/body/heading">

        <h2 class="sop-body"><xsl:value-of select="."/></h2>
    </xsl:template>

    <xsl:template match="motion">
        <p class="motion"><xsl:value-of select="."/></p>
    </xsl:template>


    <xsl:template match="billdetail">
        <div class="billdetail">
            <xsl:if test="@data-hook!=''">
                <xsl:attribute name="data-hook">
                    <xsl:value-of select="@data-hook"/>
                </xsl:attribute>
                <xsl:attribute name="data-hook-length">
                    <xsl:value-of select="@data-hook-length"/>
                </xsl:attribute>
            </xsl:if>
            <h1 class="title"><xsl:value-of select="title"/></h1>
            <p class="billtype"><xsl:value-of select="billtype"/></p>
            <p class="bill-identifier"><xsl:value-of select="../@bill.no"/>-<xsl:value-of select="../@stage"/></p>
            <xsl:apply-templates select="explnote"/>
        </div>
    </xsl:template>

    <xsl:template match="explnote">
        <div class="explnote">
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
             <h2 class="explnote"><xsl:value-of select="heading"/></h2>
             <xsl:apply-templates select="explnote.group"/>
         </div>
    </xsl:template>

    <xsl:template match="explnote.group">
         <h3 class="explnote-group"><xsl:value-of select="heading"/></h3>
         <xsl:apply-templates select="para|explnote.subhead1"/>
    </xsl:template>

      <xsl:template match="explnote.subhead1">
         <h5 class="explnote-subhead1"><xsl:value-of select="."/></h5>
    </xsl:template>




</xsl:stylesheet>